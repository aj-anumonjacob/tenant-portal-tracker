<?php
// backend/api/import_export.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/config/helpers.php';

$database = new Database();
$db = $database->getConnection();

setupCORS();
$user = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];

// GET: Handle Template Generation and Task Data Export
if ($method === 'GET') {
    $projectId = isset($_GET['project_id']) ? intval($_GET['project_id']) : 0;
    $action = isset($_GET['action']) ? trim($_GET['action']) : 'template'; // 'template' or 'export'

    if ($projectId <= 0) {
        sendResponse(false, "Invalid or missing project_id parameter.", null, 400);
    }

    try {
        // Fetch enabled custom fields for this project
        $fieldsQuery = "SELECT id, field_name, field_key, field_type 
                        FROM project_custom_fields 
                        WHERE project_id = :project_id AND status = 'enabled'
                        ORDER BY sort_order ASC, id ASC";
        $fieldsStmt = $db->prepare($fieldsQuery);
        $fieldsStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $fieldsStmt->execute();
        $fieldsDef = $fieldsStmt->fetchAll();

        // 1. Build Headers
        $headers = ['Task ID', 'Task Status'];
        foreach ($fieldsDef as $field) {
            $headers[] = $field['field_name'];
        }

        // Set response headers for download
        $filename = ($action === 'export') ? "tasks_export_project_{$projectId}.csv" : "tasks_template_project_{$projectId}.csv";
        
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');

        // Open standard output stream
        $out = fopen('php://output', 'w');
        
        // Write UTF-8 BOM to ensure Excel opens file with correct UTF-8 encoding
        fwrite($out, "\xEF\xBB\xBF");
        
        // Write headers
        fputcsv($out, $headers);

        // 2. If action is export, output task values
        if ($action === 'export') {
            // Retrieve core task entries
            $tasksQuery = "SELECT id, task_status FROM tasks WHERE project_id = :project_id ORDER BY id DESC";
            $tasksStmt = $db->prepare($tasksQuery);
            $tasksStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
            $tasksStmt->execute();
            $tasksList = $tasksStmt->fetchAll();

            if (!empty($tasksList)) {
                // Fetch all custom field values for this project's tasks
                $valuesQuery = "SELECT v.task_id, v.custom_field_id, v.field_value 
                                FROM task_custom_field_values v
                                JOIN project_custom_fields f ON v.custom_field_id = f.id
                                WHERE f.project_id = :project_id";
                $valuesStmt = $db->prepare($valuesQuery);
                $valuesStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
                $valuesStmt->execute();
                $valuesList = $valuesStmt->fetchAll();

                // Map values to taskValuesMap[taskId][fieldId]
                $taskValuesMap = [];
                foreach ($valuesList as $val) {
                    $taskValuesMap[$val['task_id']][$val['custom_field_id']] = $val['field_value'];
                }

                // Write rows
                foreach ($tasksList as $task) {
                    $taskId = $task['id'];
                    $row = [$taskId, $task['task_status']];

                    foreach ($fieldsDef as $field) {
                        $fieldVal = isset($taskValuesMap[$taskId][$field['id']]) ? $taskValuesMap[$taskId][$field['id']] : '';
                        
                        // Parse checkboxes or JSON lists into simple comma-separated string for Excel convenience
                        if (in_array($field['field_type'], ['checkbox', 'dropdown']) && !empty($fieldVal) && strpos($fieldVal, '[') === 0) {
                            try {
                                $decoded = json_decode($fieldVal, true);
                                if (is_array($decoded)) {
                                    $fieldVal = implode(', ', $decoded);
                                }
                            } catch (Exception $e) {
                                // keep original
                            }
                        }
                        
                        $row[] = $fieldVal;
                    }
                    
                    fputcsv($out, $row);
                }
            }
        }

        fclose($out);
        exit;

    } catch (Exception $e) {
        sendResponse(false, "Export failed: " . $e->getMessage(), null, 500);
    }
}

// POST: Parse Uploaded CSV and bulk import (Insert/Update)
elseif ($method === 'POST') {
    $projectId = isset($_GET['project_id']) ? intval($_GET['project_id']) : 0;
    
    if ($projectId <= 0) {
        sendResponse(false, "Invalid or missing project_id query parameter.", null, 400);
    }

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        sendResponse(false, "Please upload a valid CSV file.", null, 400);
    }

    $fileTmpPath = $_FILES['file']['tmp_name'];
    $fileName = $_FILES['file']['name'];
    
    // Check file extension (restrict to csv)
    $fileNameCmps = explode(".", $fileName);
    $fileExtension = strtolower(end($fileNameCmps));
    if ($fileExtension !== 'csv') {
        sendResponse(false, "Invalid file format. Please upload a .csv file.", null, 400);
    }

    try {
        // 1. Fetch enabled custom fields configurations to build maps
        $fieldsQuery = "SELECT id, field_name, field_key, field_type, is_required FROM project_custom_fields WHERE project_id = :project_id AND status = 'enabled'";
        $fieldsStmt = $db->prepare($fieldsQuery);
        $fieldsStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $fieldsStmt->execute();
        $fieldsDef = $fieldsStmt->fetchAll();

        // 2. Open and read CSV file
        $fileHandle = fopen($fileTmpPath, 'r');
        if (!$fileHandle) {
            sendResponse(false, "Unable to read uploaded file.", null, 500);
        }

        // Check for and skip UTF-8 BOM
        $bom = fread($fileHandle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($fileHandle);
        }

        // Parse headers row
        $headers = fgetcsv($fileHandle);
        if (!$headers) {
            fclose($fileHandle);
            sendResponse(false, "The uploaded CSV file is empty.", null, 400);
        }

        // Match indexes for Task ID, Task Status, and Custom Fields
        $idIndex = null;
        $statusIndex = null;
        $fieldsMap = []; // Maps CSV column index -> project_custom_fields field definition row

        foreach ($headers as $index => $header) {
            $headerClean = strtolower(trim($header));
            if ($headerClean === 'task id' || $headerClean === 'id') {
                $idIndex = $index;
            } elseif ($headerClean === 'task status' || $headerClean === 'status') {
                $statusIndex = $index;
            } else {
                // Try to find matching custom field by field_name (case insensitive)
                foreach ($fieldsDef as $field) {
                    if (strtolower(trim($field['field_name'])) === $headerClean) {
                        $fieldsMap[$index] = $field;
                        break;
                    }
                }
            }
        }

        // 3. Process rows
        $createdCount = 0;
        $updatedCount = 0;
        $errors = [];
        $rowNum = 1;

        while (($row = fgetcsv($fileHandle)) !== false) {
            $rowNum++;

            // Skip empty rows
            $nonEmptyValues = array_filter($row, function($cell) {
                return $cell !== null && trim($cell) !== '';
            });
            if (empty($nonEmptyValues)) {
                continue;
            }

            // Extract core fields
            $taskId = ($idIndex !== null && isset($row[$idIndex])) ? intval(trim($row[$idIndex])) : 0;
            $taskStatus = ($statusIndex !== null && isset($row[$statusIndex])) ? trim($row[$statusIndex]) : 'To Do';

            // Validate status
            $validStatuses = ['To Do', 'In Progress', 'Completed'];
            if (!in_array($taskStatus, $validStatuses)) {
                $taskStatus = 'To Do';
            }

            // Extract custom field values
            $fieldValues = [];
            $validationFailed = false;

            foreach ($fieldsMap as $colIndex => $field) {
                $cellVal = isset($row[$colIndex]) ? trim($row[$colIndex]) : '';

                // Handle validations
                if ($field['is_required'] && $cellVal === '') {
                    $errors[] = "Row $rowNum: Field '{$field['field_name']}' is required.";
                    $validationFailed = true;
                    break;
                }

                // Format checkboxes
                if ($field['field_type'] === 'checkbox') {
                    if ($cellVal !== '') {
                        $checkboxArray = array_map('trim', explode(',', $cellVal));
                        $cellVal = json_encode($checkboxArray);
                    } else {
                        $cellVal = '[]';
                    }
                }

                $fieldValues[$field['id']] = $cellVal;
            }

            if ($validationFailed) {
                continue; // Skip processing this row
            }

            // Database Save Operations
            try {
                $db->beginTransaction();
                $isExisting = false;

                if ($taskId > 0) {
                    // Double check task exists and belongs to this project
                    $stmt = $db->prepare("SELECT id FROM tasks WHERE id = :id AND project_id = :project_id");
                    $stmt->bindParam(':id', $taskId, PDO::PARAM_INT);
                    $stmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
                    $stmt->execute();
                    if ($stmt->fetch()) {
                        $isExisting = true;
                    }
                }

                if ($isExisting) {
                    // Update task status
                    $updateStmt = $db->prepare("UPDATE tasks SET task_status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
                    $updateStmt->bindParam(':status', $taskStatus, PDO::PARAM_STR);
                    $updateStmt->bindParam(':id', $taskId, PDO::PARAM_INT);
                    $updateStmt->execute();

                    // Upsert custom fields values
                    foreach ($fieldValues as $fieldId => $val) {
                        $upsertQuery = "INSERT INTO task_custom_field_values (task_id, custom_field_id, field_value) 
                                        VALUES (:task_id, :field_id, :val) 
                                        ON DUPLICATE KEY UPDATE field_value = :val2, updated_at = CURRENT_TIMESTAMP";
                        $upsertStmt = $db->prepare($upsertQuery);
                        $upsertStmt->bindParam(':task_id', $taskId, PDO::PARAM_INT);
                        $upsertStmt->bindParam(':field_id', $fieldId, PDO::PARAM_INT);
                        $upsertStmt->bindParam(':val', $val, PDO::PARAM_STR);
                        $upsertStmt->bindParam(':val2', $val, PDO::PARAM_STR);
                        $upsertStmt->execute();
                    }

                    logActivity($db, $projectId, $user['user_id'], 'Task Imported (Update)', 'Updated task ID ' . $taskId . ' via CSV.');
                    $updatedCount++;

                } else {
                    // Create new task
                    $insertStmt = $db->prepare("INSERT INTO tasks (project_id, task_status) VALUES (:project_id, :status)");
                    $insertStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
                    $insertStmt->bindParam(':status', $taskStatus, PDO::PARAM_STR);
                    $insertStmt->execute();
                    $newTaskId = $db->lastInsertId();

                    // Insert custom fields values
                    foreach ($fieldValues as $fieldId => $val) {
                        $valInsert = $db->prepare("INSERT INTO task_custom_field_values (task_id, custom_field_id, field_value) VALUES (:task_id, :field_id, :val)");
                        $valInsert->bindParam(':task_id', $newTaskId, PDO::PARAM_INT);
                        $valInsert->bindParam(':field_id', $fieldId, PDO::PARAM_INT);
                        $valInsert->bindParam(':val', $val, PDO::PARAM_STR);
                        $valInsert->execute();
                    }

                    logActivity($db, $projectId, $user['user_id'], 'Task Imported (Create)', 'Created task ID ' . $newTaskId . ' via CSV.');
                    $createdCount++;
                }

                $db->commit();

            } catch (Exception $e) {
                $db->rollBack();
                $errors[] = "Row $rowNum: DB save failed - " . $e->getMessage();
            }
        }

        fclose($fileHandle);

        sendResponse(true, "Bulk import completed.", [
            'created_count' => $createdCount,
            'updated_count' => $updatedCount,
            'errors' => $errors
        ], 200);

    } catch (Exception $e) {
        sendResponse(false, "Import operation failed: " . $e->getMessage(), null, 500);
    }
} else {
    sendResponse(false, "Method not allowed.", null, 405);
}
