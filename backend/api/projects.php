<?php
// backend/api/projects.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/config/helpers.php';

$database = new Database();
$db = $database->getConnection();

setupCORS();
$user = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $query = "SELECT id, name, description, created_at, updated_at FROM projects ORDER BY name ASC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $projects = $stmt->fetchAll();
        
        sendResponse(true, "Projects retrieved successfully.", $projects, 200);
    } catch (Exception $e) {
        sendResponse(false, "Failed to retrieve projects: " . $e->getMessage(), null, 500);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (empty($input['name'])) {
        sendResponse(false, "Project name is required.", null, 400);
    }
    
    $name = trim($input['name']);
    $description = isset($input['description']) ? trim($input['description']) : '';
    
    try {
        // Check if project name exists
        $checkQuery = "SELECT id FROM projects WHERE name = :name LIMIT 1";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':name', $name, PDO::PARAM_STR);
        $checkStmt->execute();
        
        if ($checkStmt->fetch()) {
            sendResponse(false, "Project with this name already exists.", null, 400);
        }
        
        $query = "INSERT INTO projects (name, description) VALUES (:name, :description)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':name', $name, PDO::PARAM_STR);
        $stmt->bindParam(':description', $description, PDO::PARAM_STR);
        $stmt->execute();
        
        $projectId = $db->lastInsertId();
        
        logActivity($db, $projectId, $user['user_id'], 'Project Created', 'Created project: ' . $name);
        
        $newProject = [
            'id' => $projectId,
            'name' => $name,
            'description' => $description
        ];
        
        sendResponse(true, "Project created successfully.", $newProject, 201);
    } catch (Exception $e) {
        sendResponse(false, "Failed to create project: " . $e->getMessage(), null, 500);
    }
} else {
    sendResponse(false, "Method not allowed.", null, 405);
}
