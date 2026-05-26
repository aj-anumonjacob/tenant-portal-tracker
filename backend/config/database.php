<?php
// backend/config/database.php

class Database {
    private $host;
    private $port;
    private $db_name;
    private $username;
    private $password;
    public $conn;

    public function __construct() {
        $this->loadEnv();
        $this->host = $this->getEnvVar('DB_HOST', 'localhost');
        $this->port = $this->getEnvVar('DB_PORT', '3306');
        $this->db_name = $this->getEnvVar('DB_NAME', 'tenant_tracker_db');
        $this->username = $this->getEnvVar('DB_USER', 'root');
        $this->password = $this->getEnvVar('DB_PASS', '');
    }

    private function getEnvVar($key, $default = '') {
        if (isset($_ENV[$key])) {
            return $_ENV[$key];
        }
        if (isset($_SERVER[$key])) {
            return $_SERVER[$key];
        }
        if (function_exists('getenv')) {
            $val = getenv($key);
            if ($val !== false) {
                return $val;
            }
        }
        return $default;
    }

    private function loadEnv() {
        // Look for .env first
        $envPath = dirname(__DIR__) . '/.env';
        
        // Fallback to env.ini if the file manager hides or blocks dotfiles
        if (!file_exists($envPath)) {
            $envPath = dirname(__DIR__) . '/env.ini';
        }
        
        if (file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) {
                    continue;
                }
                $parts = explode('=', $line, 2);
                if (count($parts) === 2) {
                    $name = trim($parts[0]);
                    $value = trim($parts[1]);
                    // Strip quotes
                    $value = trim($value, '"\'');
                    if (function_exists('putenv')) {
                        @putenv(sprintf('%s=%s', $name, $value));
                    }
                    $_ENV[$name] = $value;
                    $_SERVER[$name] = $value;
                }
            }
        }
    }

    public function getConnection() {
        $this->conn = null;
        try {
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $exception) {
            header('Content-Type: application/json; charset=UTF-8');
            http_response_code(500);
            
            // Helpful debug information for path resolution
            $searchDir = dirname(__DIR__);
            $hasEnv = file_exists($searchDir . '/.env') || file_exists($searchDir . '/env.ini');
            $envStatus = $hasEnv ? "Found config file." : "Missing config file (.env / env.ini not found in $searchDir).";
            
            echo json_encode([
                "success" => false,
                "message" => "Database connection error: " . $exception->getMessage() . " | " . $envStatus . " | Loaded Host: " . $this->host
            ]);
            exit;
        }
        return $this->conn;
    }
}
