<?php
// backend/api/kanban.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/config/helpers.php';

$database = new Database();
$db = $database->getConnection();

setupCORS();
$user = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $projectId = isset($_GET['project_id']) ? intval($_GET['project_id']) : 0;
    if ($projectId <= 0) {
        sendResponse(false, "Invalid or missing project_id parameter.", null, 400);
    }
    
    try {
        // 1. Get custom field definitions (so frontend can display secondary info on Kanban cards)
        $fieldsQuery = "SELECT id, field_key, field_name, field_type FROM project_custom_fields WHERE project_id = :project_id AND status = 'enabled'";
        $fieldsStmt = $db->prepare($fieldsQuery);
        $fieldsStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $fieldsStmt->execute();
        $fields = $fieldsStmt->fetchAll();
        
        $customFieldsMap = [];
        foreach ($fields as $f) {
            $customFieldsMap[$f['id']] = $f['field_key'];
        }
        
        // 2. Fetch all tasks for this project
        $tasksQuery = "SELECT id, task_status, created_at, updated_at FROM tasks WHERE project_id = :project_id ORDER BY updated_at DESC";
        $tasksStmt = $db->prepare($tasksQuery);
        $tasksStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $tasksStmt->execute();
        $tasks = $tasksStmt->fetchAll();
        
        // 3. Fetch all custom field values
        $valuesQuery = "
            SELECT v.task_id, v.custom_field_id, v.field_value 
            FROM task_custom_field_values v
            JOIN project_custom_fields f ON v.custom_field_id = f.id
            WHERE f.project_id = :project_id
        ";
        $valuesStmt = $db->prepare($valuesQuery);
        $valuesStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $valuesStmt->execute();
        $values = $valuesStmt->fetchAll();
        
        // Map values to tasks
        $taskValuesMap = [];
        foreach ($values as $val) {
            $taskId = $val['task_id'];
            $fieldId = $val['custom_field_id'];
            $fieldVal = $val['field_value'];
            
            if (isset($customFieldsMap[$fieldId])) {
                $fieldKey = $customFieldsMap[$fieldId];
                $taskValuesMap[$taskId][$fieldKey] = $fieldVal;
            }
        }
        
        // Populate and group tasks by status
        $columns = [
            'To Do' => [],
            'In Progress' => [],
            'Completed' => []
        ];
        
        foreach ($tasks as $task) {
            $taskId = $task['id'];
            $status = $task['task_status'];
            
            // Fallback for statuses outside standard three
            if (!isset($columns[$status])) {
                $columns[$status] = [];
            }
            
            $taskData = [
                'id' => $taskId,
                'task_status' => $status,
                'created_at' => $task['created_at'],
                'updated_at' => $task['updated_at']
            ];
            
            // Map custom fields to card data
            foreach ($customFieldsMap as $fid => $key) {
                $taskData[$key] = isset($taskValuesMap[$taskId][$key]) ? $taskValuesMap[$taskId][$key] : '';
            }
            
            $columns[$status][] = $taskData;
        }
        
        sendResponse(true, "Kanban columns retrieved successfully.", $columns, 200);
        
    } catch (Exception $e) {
        sendResponse(false, "Failed to retrieve Kanban data: " . $e->getMessage(), null, 500);
    }
} elseif ($method === 'PUT' || $method === 'POST') {
    // We allow POST here as well for CORS/cPanel compatibility if PUT is blocked
    $input = json_decode(file_get_contents("php://input"), true);
    if (empty($input)) {
        $input = $_POST;
    }
    
    $taskId = isset($input['id']) ? intval($input['id']) : (isset($_GET['id']) ? intval($_GET['id']) : 0);
    $newStatus = isset($input['task_status']) ? trim($input['task_status']) : '';
    
    if ($taskId <= 0 || empty($newStatus)) {
        sendResponse(false, "Task ID and task_status are required.", null, 400);
    }
    
    // Validate status
    $validStatuses = ['To Do', 'In Progress', 'Completed'];
    if (!in_array($newStatus, $validStatuses)) {
        sendResponse(false, "Invalid status column. Must be 'To Do', 'In Progress', or 'Completed'.", null, 400);
    }
    
    try {
        // Fetch task for logging
        $stmt = $db->prepare("SELECT project_id, task_status FROM tasks WHERE id = :id");
        $stmt->bindParam(':id', $taskId, PDO::PARAM_INT);
        $stmt->execute();
        $task = $stmt->fetch();
        
        if (!$task) {
            sendResponse(false, "Task not found.", null, 404);
        }
        
        $oldStatus = $task['task_status'];
        
        // Update task status
        $updateStmt = $db->prepare("UPDATE tasks SET task_status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
        $updateStmt->bindParam(':status', $newStatus, PDO::PARAM_STR);
        $updateStmt->bindParam(':id', $taskId, PDO::PARAM_INT);
        $updateStmt->execute();
        
        logActivity($db, $task['project_id'], $user['user_id'], 'Kanban Move', "Moved task ID $taskId from '$oldStatus' to '$newStatus'");
        
        sendResponse(true, "Task column updated successfully.", ['id' => $taskId, 'task_status' => $newStatus], 200);
        
    } catch (Exception $e) {
        sendResponse(false, "Failed to update task column: " . $e->getMessage(), null, 500);
    }
} else {
    sendResponse(false, "Method not allowed.", null, 405);
}
