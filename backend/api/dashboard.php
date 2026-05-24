<?php
// backend/api/dashboard.php
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
        // 1. Get total tasks count
        $totalStmt = $db->prepare("SELECT COUNT(*) as total FROM tasks WHERE project_id = :project_id");
        $totalStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $totalStmt->execute();
        $totalTasks = intval($totalStmt->fetch()['total']);
        
        // 2. Get task status counts (To Do, In Progress, Completed)
        $statusStmt = $db->prepare("SELECT task_status, COUNT(*) as count FROM tasks WHERE project_id = :project_id GROUP BY task_status");
        $statusStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $statusStmt->execute();
        $statusCounts = $statusStmt->fetchAll();
        
        $taskStatusBreakdown = ['To Do' => 0, 'In Progress' => 0, 'Completed' => 0];
        foreach ($statusCounts as $row) {
            $taskStatusBreakdown[$row['task_status']] = intval($row['count']);
        }
        
        // 3. Get EAV Custom Field Values counts
        // Query custom field values specifically for call_status and portal_status
        $eavStmt = $db->prepare("
            SELECT f.field_key, v.field_value, COUNT(*) as count 
            FROM task_custom_field_values v
            JOIN project_custom_fields f ON v.custom_field_id = f.id
            WHERE f.project_id = :project_id AND f.field_key IN ('call_status', 'portal_status')
            GROUP BY f.field_key, v.field_value
        ");
        $eavStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $eavStmt->execute();
        $eavCounts = $eavStmt->fetchAll();
        
        // Structure EAV counts
        $portalStatusBreakdown = ['Registered' => 0, 'Not Registered' => 0, 'Pending' => 0];
        $callStatusBreakdown = [
            'Follow-up Needed' => 0,
            'Call Not Picked Up' => 0,
            'Re-scheduled' => 0,
            'Facing Issue in Registration' => 0,
            'Invalid Number' => 0,
            'Completed' => 0
        ];
        
        foreach ($eavCounts as $row) {
            $key = $row['field_key'];
            $val = $row['field_value'];
            $count = intval($row['count']);
            
            if ($key === 'portal_status') {
                $portalStatusBreakdown[$val] = $count;
            } elseif ($key === 'call_status') {
                $callStatusBreakdown[$val] = $count;
            }
        }
        
        // 4. Calculate progress percentages
        $progressPercent = 0;
        if ($totalTasks > 0) {
            $progressPercent = round(($taskStatusBreakdown['Completed'] / $totalTasks) * 100);
        }
        
        $registrationRate = 0;
        if ($totalTasks > 0) {
            $registrationRate = round(($portalStatusBreakdown['Registered'] / $totalTasks) * 100);
        }
        
        // 5. Get Recent Activities
        $activityStmt = $db->prepare("
            SELECT a.id, a.action, a.details, a.created_at, u.full_name 
            FROM activity_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.project_id = :project_id OR a.project_id IS NULL
            ORDER BY a.created_at DESC 
            LIMIT 10
        ");
        $activityStmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
        $activityStmt->execute();
        $recentActivities = $activityStmt->fetchAll();
        
        // 6. Rule-based AI Recommendation Engine
        $aiAnalytics = [];
        $aiRecommendations = [];
        
        if ($totalTasks > 0) {
            // Rule 1: Portal Pending check
            $pendingRate = ($portalStatusBreakdown['Pending'] / $totalTasks) * 100;
            if ($pendingRate > 30) {
                $aiAnalytics[] = "High pending registration rate detected: " . round($pendingRate) . "% of tenants are stuck in 'Pending'.";
                $aiRecommendations[] = "Prioritize follow-up with pending registrations. Reach out to resolve technical or credential issues.";
            }
            
            // Rule 2: Invalid Numbers check
            $invalidRate = ($callStatusBreakdown['Invalid Number'] / $totalTasks) * 100;
            if ($invalidRate > 15) {
                $aiAnalytics[] = "Elevated count of invalid phone numbers found (" . round($invalidRate) . "%).";
                $aiRecommendations[] = "Liaise with leasing/contracts department to verify and correct contact details for these units.";
            }
            
            // Rule 3: High To Do tasks check
            $todoRate = ($taskStatusBreakdown['To Do'] / $totalTasks) * 100;
            if ($todoRate > 50) {
                $aiAnalytics[] = "Over half of the tracking tasks (" . round($todoRate) . "%) are still in 'To Do' state.";
                $aiRecommendations[] = "Focus team efforts on starting outstanding outreach calls today. Set daily micro-targets.";
            }
            
            // Rule 4: Registration Rate check
            if ($registrationRate < 30) {
                $aiAnalytics[] = "Critical: Overall portal registration rate is low (" . $registrationRate . "%).";
                $aiRecommendations[] = "Consider sending a mass email broadcast or SMS notification with registration guidelines to all unregistered units.";
            } elseif ($registrationRate >= 70) {
                $aiAnalytics[] = "Excellent: Portal registration rate is highly positive (" . $registrationRate . "%).";
                $aiRecommendations[] = "Maintain current momentum. For the remaining " . ($totalTasks - $portalStatusBreakdown['Registered']) . " units, execute final targeted follow-ups.";
            }
            
            // Rule 5: Facing issues check
            $issueCount = $callStatusBreakdown['Facing Issue in Registration'];
            if ($issueCount > 0) {
                $aiAnalytics[] = "$issueCount tenant(s) reported issues while trying to register on the portal.";
                $aiRecommendations[] = "Coordinate with the technical support team to inspect application errors reported in follow-up notes.";
            }
            
            // Rule 6: Call not picked up check
            $notPickedRate = ($callStatusBreakdown['Call Not Picked Up'] / $totalTasks) * 100;
            if ($notPickedRate > 25) {
                $aiAnalytics[] = "A large portion of tenants (" . round($notPickedRate) . "%) did not pick up their calls.";
                $aiRecommendations[] = "Schedule follow-up calls during alternative time slots (e.g. late afternoon or weekend mornings).";
            }
        } else {
            $aiAnalytics[] = "No tasks found in this project yet.";
            $aiRecommendations[] = "Add tenant details or import tasks to start tracking registrations and get recommendations.";
        }
        
        // Package response
        $dashboardData = [
            'metrics' => [
                'total_tasks' => $totalTasks,
                'portal_registered' => $portalStatusBreakdown['Registered'],
                'portal_not_registered' => $portalStatusBreakdown['Not Registered'],
                'portal_pending' => $portalStatusBreakdown['Pending'],
                'calls_completed' => $callStatusBreakdown['Completed'],
                'calls_followup' => $callStatusBreakdown['Follow-up Needed'],
                'calls_invalid' => $callStatusBreakdown['Invalid Number'],
                'calls_not_picked' => $callStatusBreakdown['Call Not Picked Up'],
                'progress_percentage' => $progressPercent,
                'registration_rate' => $registrationRate,
                'portal_status_breakdown' => $portalStatusBreakdown,
                'call_status_breakdown' => $callStatusBreakdown,
                'task_status_breakdown' => $taskStatusBreakdown
            ],
            'recent_activities' => $recentActivities,
            'ai_insights' => [
                'analytics' => $aiAnalytics,
                'recommendations' => $aiRecommendations
            ]
        ];
        
        sendResponse(true, "Dashboard metrics retrieved successfully.", $dashboardData, 200);
        
    } catch (Exception $e) {
        sendResponse(false, "Failed to retrieve dashboard metrics: " . $e->getMessage(), null, 500);
    }
} else {
    sendResponse(false, "Method not allowed.", null, 405);
}
