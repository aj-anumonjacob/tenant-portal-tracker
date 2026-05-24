<?php
// backend/api/auth.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/config/helpers.php';

// Initialize DB and load ENV
$database = new Database();
$db = $database->getConnection();

setupCORS();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    // Read input payload
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (empty($input['username']) || empty($input['password'])) {
        sendResponse(false, "Username and password are required.", null, 400);
    }
    
    $username = trim($input['username']);
    $password = trim($input['password']);
    
    try {
        $query = "SELECT id, username, password_hash, email, full_name, role FROM users WHERE username = :username LIMIT 1";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':username', $username, PDO::PARAM_STR);
        $stmt->execute();
        
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password_hash'])) {
            // Generate token
            $tokenPayload = [
                'user_id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role']
            ];
            $jwt = generateJWT($tokenPayload);
            
            $userData = [
                'user_id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'full_name' => $user['full_name'],
                'role' => $user['role'],
                'token' => $jwt
            ];
            
            // Log successful login
            logActivity($db, null, $user['id'], 'User Login', 'User ' . $user['username'] . ' successfully logged in.');
            
            sendResponse(true, "Login successful.", $userData, 200);
        } else {
            sendResponse(false, "Invalid username or password.", null, 401);
        }
    } catch (Exception $e) {
        sendResponse(false, "An error occurred during authentication: " . $e->getMessage(), null, 500);
    }
} else {
    sendResponse(false, "Request method not allowed.", null, 405);
}
