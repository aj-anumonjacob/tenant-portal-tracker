-- Seed data for Tenant Portal Registration Tracker

-- 1. Insert Default Administrator (password: admin123)
-- bcrypt hash of 'admin123'
INSERT INTO `users` (`id`, `username`, `password_hash`, `email`, `full_name`, `role`) VALUES
(1, 'admin', '$2y$10$KW5lQvfl7NPoI13h6Pfz3eI1bOXzTWOlYLJ10nJV113EQQR0MeM9i', 'admin@tenanttracker.local', 'System Administrator', 'admin')
ON DUPLICATE KEY UPDATE `username` = `username`;

-- 2. Insert Default Project
INSERT INTO `projects` (`id`, `name`, `description`) VALUES
(1, 'Tenant Portal', 'Tracking system for tenant registrations, verification, and follow-up status.')
ON DUPLICATE KEY UPDATE `name` = `name`;

-- 3. Insert Default Custom Fields for 'Tenant Portal' Project
INSERT INTO `project_custom_fields` (`id`, `project_id`, `field_name`, `field_key`, `field_type`, `field_options`, `is_required`, `default_value`, `sort_order`, `status`) VALUES
(1, 1, 'Unit Number', 'unit_number', 'text', NULL, 1, '', 1, 'enabled'),
(2, 1, 'Tenant Name', 'tenant_name', 'text', NULL, 1, '', 2, 'enabled'),
(3, 1, 'Phone Number', 'phone_number', 'phone', NULL, 1, '', 3, 'enabled'),
(4, 1, 'Call Status', 'call_status', 'dropdown', '["Follow-up Needed", "Call Not Picked Up", "Re-scheduled", "Facing Issue in Registration", "Invalid Number", "Completed"]', 1, 'Follow-up Needed', 4, 'enabled'),
(5, 1, 'Portal Status', 'portal_status', 'dropdown', '["Registered", "Not Registered", "Pending"]', 1, 'Not Registered', 5, 'enabled'),
(6, 1, 'Follow-up Date', 'follow_up_date', 'date', NULL, 0, '', 6, 'enabled'),
(7, 1, 'Comment', 'comment', 'textarea', NULL, 0, '', 7, 'enabled')
ON DUPLICATE KEY UPDATE `field_name` = VALUES(`field_name`), `field_key` = VALUES(`field_key`), `field_type` = VALUES(`field_type`);

-- 4. Insert Default Tasks for 'Tenant Portal' Project
INSERT INTO `tasks` (`id`, `project_id`, `task_status`) VALUES
(1, 1, 'Completed'),
(2, 1, 'In Progress'),
(3, 1, 'To Do'),
(4, 1, 'Completed'),
(5, 1, 'In Progress')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 5. Insert Task Custom Field Values
INSERT INTO `task_custom_field_values` (`task_id`, `custom_field_id`, `field_value`) VALUES
-- Task 1: Unit 101, John Doe, Completed Call, Registered Portal
(1, 1, '101'),
(1, 2, 'John Doe'),
(1, 3, '+971 50 123 4567'),
(1, 4, 'Completed'),
(1, 5, 'Registered'),
(1, 6, ''),
(1, 7, 'Registration complete and verified.'),

-- Task 2: Unit 102, Jane Smith, Follow-up Needed, Pending Portal
(2, 1, '102'),
(2, 2, 'Jane Smith'),
(2, 3, '+971 55 987 6543'),
(2, 4, 'Follow-up Needed'),
(2, 5, 'Pending'),
(2, 6, '2026-05-28'),
(2, 7, 'Tenant lost activation code. Re-sent the email, follow up on completion.'),

-- Task 3: Unit 201, Bob Johnson, Call Not Picked Up, Not Registered Portal
(3, 1, '201'),
(3, 2, 'Bob Johnson'),
(3, 3, '+971 52 444 3322'),
(3, 4, 'Call Not Picked Up'),
(3, 5, 'Not Registered'),
(3, 6, '2026-05-26'),
(3, 7, 'Tried calling twice, no answer. Left a voicemail.'),

-- Task 4: Unit 202, Alice Brown, Invalid Number, Not Registered Portal
(4, 1, '202'),
(4, 2, 'Alice Brown'),
(4, 3, '+971 50 000 0000'),
(4, 4, 'Invalid Number'),
(4, 5, 'Not Registered'),
(4, 6, ''),
(4, 7, 'Number out of service. Need to check landlord contract for secondary contact.'),

-- Task 5: Unit 301, Charlie Green, Facing Issue, Pending Portal
(5, 1, '301'),
(5, 2, 'Charlie Green'),
(5, 3, '+971 58 111 2222'),
(5, 4, 'Facing Issue in Registration'),
(5, 5, 'Pending'),
(5, 6, '2026-05-25'),
(5, 7, 'App crashing on mobile during ID upload. Reported to technical support.')
ON DUPLICATE KEY UPDATE `field_value` = `field_value`;

-- 6. Insert Sample Activity Logs
INSERT INTO `activity_logs` (`id`, `project_id`, `user_id`, `action`, `details`) VALUES
(1, 1, 1, 'Project Created', 'Project "Tenant Portal" initialized by Admin'),
(2, 1, 1, 'Task Created', 'Added task for Unit 101: John Doe'),
(3, 1, 1, 'Task Created', 'Added task for Unit 102: Jane Smith'),
(4, 1, 1, 'Task Status Update', 'Task for Unit 101 status changed to Completed'),
(5, 1, 1, 'Task Created', 'Added task for Unit 201: Bob Johnson')
ON DUPLICATE KEY UPDATE `id` = `id`;
