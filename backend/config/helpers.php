<?php
// backend/config/helpers.php

// 1. CORS Headers Setup
function setupCORS() {
    $origin = getenv('ALLOWED_ORIGIN') ?: '*';
    header("Access-Control-Allow-Origin: " . $origin);
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Authorization, X-Requested-With");

    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// 2. Base64URL encoding helpers
function base64UrlEncode($data) {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
}

function base64UrlDecode($data) {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $padlen = 4 - $remainder;
        $data .= str_repeat('=', $padlen);
    }
    return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
}

// 3. JWT-like signature generator
function generateJWT($payload) {
    $secret = getenv('JWT_SECRET') ?: 'super_secret_key_change_me_in_production';
    
    $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    
    // Add default claims
    $payload['iat'] = time();
    $payload['exp'] = time() + (24 * 60 * 60); // 24 hours expiry
    
    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode(json_encode($payload));
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = base64UrlEncode($signature);
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

// 4. JWT verification
function verifyJWT($token) {
    if (empty($token)) return false;
    
    $secret = getenv('JWT_SECRET') ?: 'super_secret_key_change_me_in_production';
    $parts = explode('.', $token);
    
    if (count($parts) !== 3) return false;
    
    list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;
    
    $signature = base64UrlDecode($base64UrlSignature);
    $expectedSignature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    
    if (!hash_equals($signature, $expectedSignature)) {
        return false;
    }
    
    $payload = json_decode(base64UrlDecode($base64UrlPayload), true);
    
    // Check expiry
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return false;
    }
    
    return $payload;
}

// 5. Extract bearer token from Request
function getBearerToken() {
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
    } else if (isset($_SERVER['HTTP_X_AUTHORIZATION'])) {
        $headers = trim($_SERVER["HTTP_X_AUTHORIZATION"]);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        } elseif (isset($requestHeaders['X-Authorization'])) {
            $headers = trim($requestHeaders['X-Authorization']);
        }
    }
    
    if (!empty($headers)) {
        if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

// 6. Middleware: enforce authorization
function requireAuth() {
    $token = getBearerToken();
    if (!$token) {
        sendResponse(false, "Access Denied: Missing Authorization Token.", null, 401);
    }
    
    $decoded = verifyJWT($token);
    if (!$decoded) {
        sendResponse(false, "Access Denied: Invalid or Expired Token.", null, 401);
    }
    
    return $decoded;
}

// 7. Standardized JSON response helper
function sendResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    $response = [
        "success" => $success,
        "message" => $message
    ];
    if ($data !== null) {
        $response["data"] = $data;
    }
    echo json_encode($response);
    exit;
}

// 8. Log activity utility
function logActivity($db, $projectId, $userId, $action, $details) {
    try {
        $query = "INSERT INTO activity_logs (project_id, user_id, action, details) VALUES (:project_id, :user_id, :action, :details)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindParam(':action', $action, PDO::PARAM_STR);
        $stmt->bindParam(':details', $details, PDO::PARAM_STR);
        $stmt->execute();
    } catch (Exception $e) {
        // Fail silently for activity logging to prevent stopping core logic
    }
}
