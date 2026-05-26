<?php
// backend/api/custom_fields.php
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
        $query = "SELECT id, project_id, field_name, field_key, field_type, field_options, is_required, default_value, sort_order, status 
                  FROM project_custom_fields 
                  WHERE project_id = :project_id 
                  ORDER BY sort_order ASC, id ASC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $stmt->execute();
        $fields = $stmt->fetchAll();
        
        // Format options from JSON to array
        foreach ($fields as &$field) {
            if (!empty($field['field_options'])) {
                $field['field_options'] = json_decode($field['field_options'], true);
            } else {
                $field['field_options'] = [];
            }
            $field['is_required'] = (bool)$field['is_required'];
        }
        unset($field);
        
        sendResponse(true, "Custom fields retrieved successfully.", $fields, 200);
    } catch (Exception $e) {
        sendResponse(false, "Failed to retrieve custom fields: " . $e->getMessage(), null, 500);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (empty($input['project_id']) || empty($input['field_name']) || empty($input['field_type'])) {
        sendResponse(false, "project_id, field_name, and field_type are required.", null, 400);
    }
    
    $projectId = intval($input['project_id']);
    $fieldName = trim($input['field_name']);
    $fieldType = trim($input['field_type']);
    
    // Auto-generate key if not provided (slugify field_name)
    if (!empty($input['field_key'])) {
        $fieldKey = preg_replace('/[^a-z0-9_]/', '', strtolower(trim($input['field_key'])));
    } else {
        $fieldKey = preg_replace('/[^a-z0-9_]/', '', strtolower(str_replace(' ', '_', $fieldName)));
    }
    
    if (empty($fieldKey)) {
        sendResponse(false, "Invalid field key generated. Use alphanumeric characters and underscores.", null, 400);
    }
    
    $fieldOptions = isset($input['field_options']) ? json_encode($input['field_options']) : null;
    $isRequired = !empty($input['is_required']) ? 1 : 0;
    $defaultValue = isset($input['default_value']) ? trim($input['default_value']) : '';
    $sortOrder = isset($input['sort_order']) ? intval($input['sort_order']) : 0;
    $status = isset($input['status']) && $input['status'] === 'disabled' ? 'disabled' : 'enabled';
    
    try {
        // Validate project exists
        $projCheck = $db->prepare("SELECT id FROM projects WHERE id = :project_id");
        $projCheck->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $projCheck->execute();
        if (!$projCheck->fetch()) {
            sendResponse(false, "Target project does not exist.", null, 404);
        }
        
        // Validate key uniqueness within project
        $keyCheck = $db->prepare("SELECT id FROM project_custom_fields WHERE project_id = :project_id AND field_key = :field_key LIMIT 1");
        $keyCheck->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $keyCheck->bindParam(':field_key', $fieldKey, PDO::PARAM_STR);
        $keyCheck->execute();
        if ($keyCheck->fetch()) {
            sendResponse(false, "A custom field with key '$fieldKey' already exists in this project.", null, 400);
        }
        
        $query = "INSERT INTO project_custom_fields 
                  (project_id, field_name, field_key, field_type, field_options, is_required, default_value, sort_order, status) 
                  VALUES (:project_id, :field_name, :field_key, :field_type, :field_options, :is_required, :default_value, :sort_order, :status)";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $stmt->bindParam(':field_name', $fieldName, PDO::PARAM_STR);
        $stmt->bindParam(':field_key', $fieldKey, PDO::PARAM_STR);
        $stmt->bindParam(':field_type', $fieldType, PDO::PARAM_STR);
        $stmt->bindParam(':field_options', $fieldOptions, PDO::PARAM_STR);
        $stmt->bindParam(':is_required', $isRequired, PDO::PARAM_INT);
        $stmt->bindParam(':default_value', $defaultValue, PDO::PARAM_STR);
        $stmt->bindParam(':sort_order', $sortOrder, PDO::PARAM_INT);
        $stmt->bindParam(':status', $status, PDO::PARAM_STR);
        $stmt->execute();
        
        $fieldId = $db->lastInsertId();
        
        logActivity($db, $projectId, $user['user_id'], 'Field Created', 'Created custom field: ' . $fieldName . ' (' . $fieldType . ')');
        
        sendResponse(true, "Custom field created successfully.", [
            'id' => $fieldId,
            'project_id' => $projectId,
            'field_name' => $fieldName,
            'field_key' => $fieldKey,
            'field_type' => $fieldType,
            'is_required' => (bool)$isRequired,
            'default_value' => $defaultValue,
            'sort_order' => $sortOrder,
            'status' => $status
        ], 201);
    } catch (Exception $e) {
        sendResponse(false, "Failed to create custom field: " . $e->getMessage(), null, 500);
    }
} elseif ($method === 'PUT') {
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (empty($input['id'])) {
        sendResponse(false, "Field ID is required for updates.", null, 400);
    }
    
    $fieldId = intval($input['id']);
    
    try {
        // Retrieve field to confirm existence and get project ID
        $stmt = $db->prepare("SELECT id, project_id, field_name FROM project_custom_fields WHERE id = :id");
        $stmt->bindParam(':id', $fieldId, PDO::PARAM_INT);
        $stmt->execute();
        $field = $stmt->fetch();
        
        if (!$field) {
            sendResponse(false, "Custom field not found.", null, 404);
        }
        
        $fieldName = isset($input['field_name']) ? trim($input['field_name']) : $field['field_name'];
        $fieldOptions = isset($input['field_options']) ? json_encode($input['field_options']) : null;
        $isRequired = isset($input['is_required']) ? ($input['is_required'] ? 1 : 0) : null;
        $defaultValue = isset($input['default_value']) ? trim($input['default_value']) : null;
        $sortOrder = isset($input['sort_order']) ? intval($input['sort_order']) : null;
        $status = isset($input['status']) ? trim($input['status']) : null;
        
        // Build dynamic update query
        $updateFields = [];
        $params = [':id' => $fieldId];
        
        if (isset($input['field_name'])) {
            $updateFields[] = "field_name = :field_name";
            $params[':field_name'] = $fieldName;
        }
        if (isset($input['field_options'])) {
            $updateFields[] = "field_options = :field_options";
            $params[':field_options'] = $fieldOptions;
        }
        if (isset($input['is_required'])) {
            $updateFields[] = "is_required = :is_required";
            $params[':is_required'] = $isRequired;
        }
        if (isset($input['default_value'])) {
            $updateFields[] = "default_value = :default_value";
            $params[':default_value'] = $defaultValue;
        }
        if (isset($input['sort_order'])) {
            $updateFields[] = "sort_order = :sort_order";
            $params[':sort_order'] = $sortOrder;
        }
        if (isset($input['status'])) {
            $updateFields[] = "status = :status";
            $params[':status'] = $status;
        }
        
        if (empty($updateFields)) {
            sendResponse(false, "No fields specified for update.", null, 400);
        }
        
        $query = "UPDATE project_custom_fields SET " . implode(", ", $updateFields) . " WHERE id = :id";
        $updateStmt = $db->prepare($query);
        foreach ($params as $paramKey => &$val) {
            $updateStmt->bindParam($paramKey, $val);
        }
        $updateStmt->execute();
        
        logActivity($db, $field['project_id'], $user['user_id'], 'Field Updated', 'Updated custom field: ' . $fieldName);
        
        sendResponse(true, "Custom field updated successfully.", null, 200);
    } catch (Exception $e) {
        sendResponse(false, "Failed to update custom field: " . $e->getMessage(), null, 500);
    }
} elseif ($method === 'DELETE') {
    // Read JSON input or URL params
    $input = json_decode(file_get_contents("php://input"), true);
    $fieldId = isset($input['id']) ? intval($input['id']) : (isset($_GET['id']) ? intval($_GET['id']) : 0);
    
    if ($fieldId <= 0) {
        sendResponse(false, "Valid Field ID is required for deletion.", null, 400);
    }
    
    try {
        // Fetch field details for activity logging before deleting
        $stmt = $db->prepare("SELECT project_id, field_name FROM project_custom_fields WHERE id = :id");
        $stmt->bindParam(':id', $fieldId, PDO::PARAM_INT);
        $stmt->execute();
        $field = $stmt->fetch();
        
        if (!$field) {
            sendResponse(false, "Custom field not found.", null, 404);
        }
        
        // Delete definition (Cascade deletes values due to FK rules)
        $delQuery = "DELETE FROM project_custom_fields WHERE id = :id";
        $delStmt = $db->prepare($delQuery);
        $delStmt->bindParam(':id', $fieldId, PDO::PARAM_INT);
        $delStmt->execute();
        
        logActivity($db, $field['project_id'], $user['user_id'], 'Field Deleted', 'Deleted custom field: ' . $field['field_name']);
        
        sendResponse(true, "Custom field deleted successfully.", null, 200);
    } catch (Exception $e) {
        sendResponse(false, "Failed to delete custom field: " . $e->getMessage(), null, 500);
    }
} else {
    sendResponse(false, "Method not allowed.", null, 405);
}
