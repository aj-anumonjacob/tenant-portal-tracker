<?php
// backend/api/test_db.php
require_once dirname(__DIR__) . '/config/database.php';

// Allow public access for debugging (CORS)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Query projects
    $stmt1 = $db->query("SELECT id, name FROM projects");
    $projects = $stmt1->fetchAll(PDO::FETCH_ASSOC);
    
    // Query custom fields
    $stmt2 = $db->query("SELECT id, project_id, field_name, field_key, field_type, status FROM project_custom_fields");
    $fields = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "success" => true,
        "database_connected" => ($db !== null),
        "projects" => $projects,
        "fields" => $fields
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
