<?php
// backend/api/reports.php
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
    
    // Read filter inputs
    $startDate = isset($_GET['start_date']) ? trim($_GET['start_date']) : '';
    $endDate = isset($_GET['end_date']) ? trim($_GET['end_date']) : '';
    $taskStatus = isset($_GET['task_status']) ? trim($_GET['task_status']) : '';
    $callStatus = isset($_GET['call_status']) ? trim($_GET['call_status']) : '';
    $portalStatus = isset($_GET['portal_status']) ? trim($_GET['portal_status']) : '';
    
    try {
        // 1. Retrieve all enabled custom fields for headers and mapping
        $fieldsQuery = "SELECT id, field_key, field_name, field_type, field_options FROM project_custom_fields WHERE project_id = :project_id AND status = 'enabled' ORDER BY sort_order ASC, id ASC";
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
            $customFieldsMap[$f['id']] = $f['field_key'];
        }
        
        // 2. Build filtered task query
        $whereClauses = ["project_id = :project_id"];
        $params = [':project_id' => $projectId];
        
        if (!empty($taskStatus)) {
            $whereClauses[] = "task_status = :task_status";
            $params[':task_status'] = $taskStatus;
        }
        
        if (!empty($startDate)) {
            $whereClauses[] = "created_at >= :start_date";
            // Append start of day if just date is provided
            $params[':start_date'] = strpos($startDate, ' ') === false ? $startDate . ' 00:00:00' : $startDate;
        }
        
        if (!empty($endDate)) {
            $whereClauses[] = "created_at <= :end_date";
            // Append end of day if just date is provided
            $params[':end_date'] = strpos($endDate, ' ') === false ? $endDate . ' 23:59:59' : $endDate;
        }
        
        // Subqueries for custom field filters
        if (!empty($callStatus)) {
            $whereClauses[] = "id IN (
                SELECT task_id 
                FROM task_custom_field_values v
                JOIN project_custom_fields f ON v.custom_field_id = f.id
                WHERE f.field_key = 'call_status' AND v.field_value = :call_status
            )";
            $params[':call_status'] = $callStatus;
        }
        
        if (!empty($portalStatus)) {
            $whereClauses[] = "id IN (
                SELECT task_id 
                FROM task_custom_field_values v
                JOIN project_custom_fields f ON v.custom_field_id = f.id
                WHERE f.field_key = 'portal_status' AND v.field_value = :portal_status
            )";
            $params[':portal_status'] = $portalStatus;
        }
        
        $query = "SELECT id, task_status, created_at, updated_at FROM tasks WHERE " . implode(" AND ", $whereClauses) . " ORDER BY id DESC";
        $stmt = $db->prepare($query);
        foreach ($params as $paramKey => &$val) {
            $stmt->bindParam($paramKey, $val);
        }
        $stmt->execute();
        $tasks = $stmt->fetchAll();
        
        // If no tasks match filters, return early with empty dataset
        if (empty($tasks)) {
            sendResponse(true, "No matching report data found.", [
                'fields' => $fieldsDef,
                'tasks' => [],
                'summary' => [
                    'total' => 0,
                    'registered' => 0,
                    'not_registered' => 0,
                    'pending' => 0,
                    'completed_calls' => 0,
                    'progress_percent' => 0
                ]
            ], 200);
        }
        
        // 3. Retrieve custom field values for the matched tasks
        $taskIds = array_column($tasks, 'id');
        $inClause = implode(',', array_fill(0, count($taskIds), '?'));
        
        $valuesQuery = "
            SELECT v.task_id, v.custom_field_id, v.field_value 
            FROM task_custom_field_values v
            WHERE v.task_id IN ($inClause)
        ";
        $valuesStmt = $db->prepare($valuesQuery);
        $valuesStmt->execute($taskIds);
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
        
        // 4. Format detailed rows and calculate report-specific summaries
        $formattedTasks = [];
        $total = count($tasks);
        $registered = 0;
        $notRegistered = 0;
        $pending = 0;
        $completedCalls = 0;
        $completedTasks = 0;
        
        foreach ($tasks as $task) {
            $taskId = $task['id'];
            $status = $task['task_status'];
            
            if ($status === 'Completed') {
                $completedTasks++;
            }
            
            $taskData = [
                'id' => $taskId,
                'task_status' => $status,
                'created_at' => $task['created_at'],
                'updated_at' => $task['updated_at']
            ];
            
            // Map custom fields
            foreach ($fieldsDef as $f) {
                $key = $f['field_key'];
                $val = isset($taskValuesMap[$taskId][$key]) ? $taskValuesMap[$taskId][$key] : '';
                $taskData[$key] = $val;
                
                // Track dynamic counts for summary
                if ($key === 'portal_status') {
                    if ($val === 'Registered') $registered++;
                    elseif ($val === 'Not Registered') $notRegistered++;
                    elseif ($val === 'Pending') $pending++;
                }
                if ($key === 'call_status') {
                    if ($val === 'Completed') $completedCalls++;
                }
            }
            
            $formattedTasks[] = $taskData;
        }
        
        $progressPercent = $total > 0 ? round(($completedTasks / $total) * 100) : 0;
        
        $reportData = [
            'fields' => $fieldsDef,
            'tasks' => $formattedTasks,
            'summary' => [
                'total' => $total,
                'registered' => $registered,
                'not_registered' => $notRegistered,
                'pending' => $pending,
                'completed_calls' => $completedCalls,
                'progress_percent' => $progressPercent
            ]
        ];
        
        sendResponse(true, "Report generated successfully.", $reportData, 200);
        
    } catch (Exception $e) {
        sendResponse(false, "Failed to generate report: " . $e->getMessage(), null, 500);
    }
} else {
    sendResponse(false, "Method not allowed.", null, 405);
}
