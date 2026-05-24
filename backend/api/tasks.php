<?php
// backend/api/tasks.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/config/helpers.php';

$database = new Database();
$db = $database->getConnection();

setupCORS();
$user = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];

// Helper to handle file uploads
function handleFileUpload($fileInputName) {
    if (!isset($_FILES[$fileInputName]) || $_FILES[$fileInputName]['error'] !== UPLOAD_ERR_OK) {
        return null;
    }
    
    $uploadDir = dirname(__DIR__) . '/uploads/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $fileTmpPath = $_FILES[$fileInputName]['tmp_name'];
    $fileName = $_FILES[$fileInputName]['name'];
    $fileSize = $_FILES[$fileInputName]['size'];
    $fileType = $_FILES[$fileInputName]['type'];
    
    $fileNameCmps = explode(".", $fileName);
    $fileExtension = strtolower(end($fileNameCmps));
    
    // Sanitize file name
    $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
    
    // Restrict to safe file extensions (no executable scripts)
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'zip'];
    if (!in_array($fileExtension, $allowedExtensions)) {
        sendResponse(false, "Upload failed: File extension not allowed.", null, 400);
    }
    
    // Restrict size to 10MB
    if ($fileSize > 10 * 1024 * 1024) {
        sendResponse(false, "Upload failed: File exceeds maximum 10MB size.", null, 400);
    }
    
    $destPath = $uploadDir . $newFileName;
    if (move_uploaded_file($fileTmpPath, $destPath)) {
        // Return relative URL for client access
        return 'backend/uploads/' . $newFileName;
    }
    
    return null;
}

// 1. LIST TASKS (GET)
if ($method === 'GET') {
    $projectId = isset($_GET['project_id']) ? intval($_GET['project_id']) : 0;
    if ($projectId <= 0) {
        sendResponse(false, "Invalid or missing project_id parameter.", null, 400);
    }
    
    try {
        // 1. Get task definitions/custom fields for this project
        $fieldsQuery = "SELECT id, field_name, field_key, field_type, field_options, is_required, default_value, sort_order 
                        FROM project_custom_fields 
                        WHERE project_id = :project_id AND status = 'enabled'
                        ORDER BY sort_order ASC, id ASC";
        $fieldsStmt = $db->prepare($fieldsQuery);
        $fieldsStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $fieldsStmt->execute();
        $fieldsDef = $fieldsStmt->fetchAll();
        
        $customFieldsMap = [];
        foreach ($fieldsDef as &$f) {
            if (!empty($f['field_options'])) {
                $f['field_options'] = json_decode($f['field_options'], true);
            } else {
                $f['field_options'] = [];
            }
            $f['is_required'] = (bool)$f['is_required'];
            $customFieldsMap[$f['id']] = $f['field_key'];
        }
        
        // 2. Retrieve core task entries
        $tasksQuery = "SELECT id, project_id, task_status, created_at, updated_at 
                       FROM tasks 
                       WHERE project_id = :project_id 
                       ORDER BY id DESC";
        $tasksStmt = $db->prepare($tasksQuery);
        $tasksStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $tasksStmt->execute();
        $tasksList = $tasksStmt->fetchAll();
        
        // 3. Retrieve custom field values for all tasks in this project
        $valuesQuery = "SELECT v.task_id, v.custom_field_id, v.field_value 
                        FROM task_custom_field_values v
                        JOIN project_custom_fields f ON v.custom_field_id = f.id
                        WHERE f.project_id = :project_id";
        $valuesStmt = $db->prepare($valuesQuery);
        $valuesStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $valuesStmt->execute();
        $valuesList = $valuesStmt->fetchAll();
        
        // Map values to tasks
        $taskValuesMap = [];
        foreach ($valuesList as $val) {
            $taskId = $val['task_id'];
            $fieldId = $val['custom_field_id'];
            $fieldVal = $val['field_value'];
            
            // Map using the field key slug
            if (isset($customFieldsMap[$fieldId])) {
                $fieldKey = $customFieldsMap[$fieldId];
                $taskValuesMap[$taskId][$fieldKey] = $fieldVal;
            }
        }
        
        // Build final list of tasks populated with custom fields
        $formattedTasks = [];
        foreach ($tasksList as $task) {
            $taskId = $task['id'];
            $taskData = [
                'id' => $taskId,
                'project_id' => $task['project_id'],
                'task_status' => $task['task_status'],
                'created_at' => $task['created_at'],
                'updated_at' => $task['updated_at']
            ];
            
            // Populate all registered custom fields (ensure even empty ones have keys)
            foreach ($fieldsDef as $f) {
                $key = $f['field_key'];
                $taskData[$key] = isset($taskValuesMap[$taskId][$key]) ? $taskValuesMap[$taskId][$key] : '';
            }
            
            $formattedTasks[] = $taskData;
        }
        
        sendResponse(true, "Tasks retrieved successfully.", [
            'fields' => $fieldsDef,
            'tasks' => $formattedTasks
        ], 200);
        
    } catch (Exception $e) {
        sendResponse(false, "Failed to retrieve tasks: " . $e->getMessage(), null, 500);
    }
}

// 2. CREATE TASK (POST) or UPDATE TASK (POST with _method=PUT or POST upload)
// We support POST for updates when handling file uploads since PUT requests don't parse multipart form data natively.
elseif ($method === 'POST') {
    // Check if it's an update operation
    $isUpdate = false;
    $taskId = 0;
    
    // Determine input type (JSON vs Multipart Form-Data)
    $contentType = isset($_SERVER["CONTENT_TYPE"]) ? $_SERVER["CONTENT_TYPE"] : '';
    $input = [];
    
    if (strpos($contentType, 'application/json') !== false) {
        $input = json_decode(file_get_contents("php://input"), true);
        if (isset($input['_method']) && strtoupper($input['_method']) === 'PUT') {
            $isUpdate = true;
            $taskId = isset($input['id']) ? intval($input['id']) : 0;
        }
    } else {
        // Multipart/form-data
        $input = $_POST;
        if (isset($_GET['id'])) {
            $isUpdate = true;
            $taskId = intval($_GET['id']);
        } elseif (isset($input['id'])) {
            $isUpdate = true;
            $taskId = intval($input['id']);
        }
        
        // Decode nested fields sent from frontend form
        if (isset($input['custom_fields']) && is_string($input['custom_fields'])) {
            $input['custom_fields'] = json_decode($input['custom_fields'], true);
        }
    }
    
    if ($isUpdate) {
        // ================= UPDATE TASK =================
        if ($taskId <= 0) {
            sendResponse(false, "Invalid task ID for update.", null, 400);
        }
        
        $taskStatus = isset($input['task_status']) ? trim($input['task_status']) : null;
        $customFieldsData = isset($input['custom_fields']) ? $input['custom_fields'] : [];
        
        try {
            $db->beginTransaction();
            
            // Check if task exists and retrieve project ID
            $stmt = $db->prepare("SELECT project_id FROM tasks WHERE id = :id");
            $stmt->bindParam(':id', $taskId, PDO::PARAM_INT);
            $stmt->execute();
            $task = $stmt->fetch();
            if (!$task) {
                $db->rollBack();
                sendResponse(false, "Task not found.", null, 404);
            }
            $projectId = $task['project_id'];
            
            // Update status if provided
            if ($taskStatus !== null) {
                $upTask = $db->prepare("UPDATE tasks SET task_status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
                $upTask->bindParam(':status', $taskStatus, PDO::PARAM_STR);
                $upTask->bindParam(':id', $taskId, PDO::PARAM_INT);
                $upTask->execute();
            }
            
            // Retrieve custom fields definitions for validation
            $fieldsQuery = "SELECT id, field_key, field_name, field_type, is_required FROM project_custom_fields WHERE project_id = :project_id AND status = 'enabled'";
            $fieldsStmt = $db->prepare($fieldsQuery);
            $fieldsStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
            $fieldsStmt->execute();
            $fieldsDef = $fieldsStmt->fetchAll();
            
            // Save each custom field value
            foreach ($fieldsDef as $field) {
                $fieldId = $field['id'];
                $fieldKey = $field['field_key'];
                $fieldType = $field['field_type'];
                $isRequired = $field['is_required'];
                
                $value = null;
                
                // Handle files
                if ($fieldType === 'file') {
                    $fileUrl = handleFileUpload($fieldKey);
                    if ($fileUrl !== null) {
                        $value = $fileUrl;
                    } else {
                        // Keep existing file path if no new file is uploaded
                        $existQuery = $db->prepare("SELECT field_value FROM task_custom_field_values WHERE task_id = :task_id AND custom_field_id = :field_id");
                        $existQuery->bindParam(':task_id', $taskId, PDO::PARAM_INT);
                        $existQuery->bindParam(':field_id', $fieldId, PDO::PARAM_INT);
                        $existQuery->execute();
                        $existVal = $existQuery->fetch();
                        
                        if ($existVal) {
                            $value = $existVal['field_value'];
                        } else {
                            $value = '';
                        }
                    }
                } else {
                    // Normal inputs
                    if (isset($customFieldsData[$fieldKey])) {
                        $value = is_array($customFieldsData[$fieldKey]) ? json_encode($customFieldsData[$fieldKey]) : trim($customFieldsData[$fieldKey]);
                    } else {
                        // Skip if the value wasn't even sent in updates (partial update)
                        continue;
                    }
                }
                
                // Validation for required fields
                if ($isRequired && empty($value)) {
                    $db->rollBack();
                    sendResponse(false, "Validation error: Dynamic field '" . $field['field_name'] . "' is required.", null, 400);
                }
                
                // Upsert value into task_custom_field_values
                $upsertQuery = "INSERT INTO task_custom_field_values (task_id, custom_field_id, field_value) 
                                VALUES (:task_id, :field_id, :val) 
                                ON DUPLICATE KEY UPDATE field_value = :val2, updated_at = CURRENT_TIMESTAMP";
                $upsertStmt = $db->prepare($upsertQuery);
                $upsertStmt->bindParam(':task_id', $taskId, PDO::PARAM_INT);
                $upsertStmt->bindParam(':field_id', $fieldId, PDO::PARAM_INT);
                $upsertStmt->bindParam(':val', $value, PDO::PARAM_STR);
                $upsertStmt->bindParam(':val2', $value, PDO::PARAM_STR);
                $upsertStmt->execute();
            }
            
            // Log update activity
            logActivity($db, $projectId, $user['user_id'], 'Task Updated', 'Updated task ID ' . $taskId . ' in project ID ' . $projectId);
            
            $db->commit();
            sendResponse(true, "Task updated successfully.", ['id' => $taskId], 200);
            
        } catch (Exception $e) {
            $db->rollBack();
            sendResponse(false, "Failed to update task: " . $e->getMessage(), null, 500);
        }
    } else {
        // ================= CREATE TASK =================
        if (empty($input['project_id'])) {
            sendResponse(false, "project_id is required.", null, 400);
        }
        
        $projectId = intval($input['project_id']);
        $taskStatus = isset($input['task_status']) ? trim($input['task_status']) : 'To Do';
        $customFieldsData = isset($input['custom_fields']) ? $input['custom_fields'] : [];
        
        try {
            $db->beginTransaction();
            
            // Validate project exists
            $projCheck = $db->prepare("SELECT id FROM projects WHERE id = :project_id");
            $projCheck->bindParam(':project_id', $projectId, PDO::PARAM_INT);
            $projCheck->execute();
            if (!$projCheck->fetch()) {
                $db->rollBack();
                sendResponse(false, "Target project does not exist.", null, 404);
            }
            
            // Insert core task record
            $insertTask = $db->prepare("INSERT INTO tasks (project_id, task_status) VALUES (:project_id, :status)");
            $insertTask->bindParam(':project_id', $projectId, PDO::PARAM_INT);
            $insertTask->bindParam(':status', $taskStatus, PDO::PARAM_STR);
            $insertTask->execute();
            $taskId = $db->lastInsertId();
            
            // Retrieve custom field definitions for this project
            $fieldsQuery = "SELECT id, field_key, field_name, field_type, is_required, default_value 
                            FROM project_custom_fields 
                            WHERE project_id = :project_id AND status = 'enabled'";
            $fieldsStmt = $db->prepare($fieldsQuery);
            $fieldsStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
            $fieldsStmt->execute();
            $fieldsDef = $fieldsStmt->fetchAll();
            
            // Save values for all enabled custom fields
            foreach ($fieldsDef as $field) {
                $fieldId = $field['id'];
                $fieldKey = $field['field_key'];
                $fieldType = $field['field_type'];
                $isRequired = $field['is_required'];
                $defaultValue = $field['default_value'];
                
                $value = '';
                
                // Handle files
                if ($fieldType === 'file') {
                    $fileUrl = handleFileUpload($fieldKey);
                    $value = $fileUrl !== null ? $fileUrl : '';
                } else {
                    // Normal fields
                    if (isset($customFieldsData[$fieldKey])) {
                        $value = is_array($customFieldsData[$fieldKey]) ? json_encode($customFieldsData[$fieldKey]) : trim($customFieldsData[$fieldKey]);
                    } else {
                        // Use default value if missing
                        $value = $defaultValue;
                    }
                }
                
                // Validation for required fields
                if ($isRequired && empty($value)) {
                    $db->rollBack();
                    sendResponse(false, "Validation error: Dynamic field '" . $field['field_name'] . "' is required.", null, 400);
                }
                
                // Save custom field value
                $valInsert = $db->prepare("INSERT INTO task_custom_field_values (task_id, custom_field_id, field_value) VALUES (:task_id, :field_id, :val)");
                $valInsert->bindParam(':task_id', $taskId, PDO::PARAM_INT);
                $valInsert->bindParam(':field_id', $fieldId, PDO::PARAM_INT);
                $valInsert->bindParam(':val', $value, PDO::PARAM_STR);
                $valInsert->execute();
            }
            
            // Log creation activity
            logActivity($db, $projectId, $user['user_id'], 'Task Created', 'Created task ID ' . $taskId . ' in project ID ' . $projectId);
            
            $db->commit();
            sendResponse(true, "Task created successfully.", ['id' => $taskId], 201);
            
        } catch (Exception $e) {
            $db->rollBack();
            sendResponse(false, "Failed to create task: " . $e->getMessage(), null, 500);
        }
    }
}

// 3. DELETE TASK (DELETE)
elseif ($method === 'DELETE') {
    // Read JSON input or URL params
    $input = json_decode(file_get_contents("php://input"), true);
    $taskId = isset($input['id']) ? intval($input['id']) : (isset($_GET['id']) ? intval($_GET['id']) : 0);
    
    if ($taskId <= 0) {
        sendResponse(false, "Valid Task ID is required for deletion.", null, 400);
    }
    
    try {
        // Fetch task details for activity logging
        $stmt = $db->prepare("SELECT project_id FROM tasks WHERE id = :id");
        $stmt->bindParam(':id', $taskId, PDO::PARAM_INT);
        $stmt->execute();
        $task = $stmt->fetch();
        
        if (!$task) {
            sendResponse(false, "Task not found.", null, 404);
        }
        
        // Delete task (values are cascade-deleted)
        $delStmt = $db->prepare("DELETE FROM tasks WHERE id = :id");
        $delStmt->bindParam(':id', $taskId, PDO::PARAM_INT);
        $delStmt->execute();
        
        logActivity($db, $task['project_id'], $user['user_id'], 'Task Deleted', 'Deleted task ID ' . $taskId);
        
        sendResponse(true, "Task deleted successfully.", null, 200);
    } catch (Exception $e) {
        sendResponse(false, "Failed to delete task: " . $e->getMessage(), null, 500);
    }
} else {
    sendResponse(false, "Method not allowed.", null, 405);
}
