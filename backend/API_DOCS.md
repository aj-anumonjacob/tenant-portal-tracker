# PHP REST API Documentation

This document describes the endpoints, authentication headers, request payloads, and response structures for the Tenant Portal Registration Tracker backend.

## Global Headers & Settings

- **Content-Type**: `application/json; charset=UTF-8` (except when uploading files via `multipart/form-data`)
- **Authentication**: Bearer Token in authorization header (required for all endpoints except `auth.php`):
  ```http
  Authorization: Bearer <your_jwt_like_token>
  ```
- **CORS Support**: Returns standard Access-Control headers allowing cross-origin requests.

---

## 1. Authentication Endpoints

### Login (`POST auth.php`)
Authenticate credentials and obtain bearer token.
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "data": {
      "user_id": 1,
      "username": "admin",
      "email": "admin@tenanttracker.local",
      "full_name": "System Administrator",
      "role": "admin",
      "token": "header.payload.signature"
    }
  }
  ```

---

## 2. Projects Endpoints

### List Projects (`GET projects.php`)
Retrieve all available workspace projects.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Projects retrieved successfully.",
    "data": [
      {
        "id": 1,
        "name": "Tenant Portal",
        "description": "Tracking system for tenant registrations.",
        "created_at": "2026-05-24 12:00:00",
        "updated_at": "2026-05-24 12:00:00"
      }
    ]
  }
  ```

### Create Project (`POST projects.php`)
- **Request Body**:
  ```json
  {
    "name": "Employee Onboarding",
    "description": "Form to manage new employee onboarding tasks"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Project created successfully.",
    "data": {
      "id": 2,
      "name": "Employee Onboarding",
      "description": "Form to manage new employee onboarding tasks"
    }
  }
  ```

---

## 3. Custom Fields Builder Endpoints

### Get Project Fields (`GET custom_fields.php?project_id=<id>`)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Custom fields retrieved successfully.",
    "data": [
      {
        "id": 1,
        "project_id": 1,
        "field_name": "Unit Number",
        "field_key": "unit_number",
        "field_type": "text",
        "field_options": [],
        "is_required": true,
        "default_value": "",
        "sort_order": 1,
        "status": "enabled"
      }
    ]
  }
  ```

### Create Custom Field (`POST custom_fields.php`)
Create a new dynamic field definition for a project workspace.
- **Request Body**:
  ```json
  {
    "project_id": 1,
    "field_name": "Contract Value",
    "field_key": "contract_value",
    "field_type": "number",
    "field_options": null,
    "is_required": 0,
    "default_value": "0",
    "sort_order": 5,
    "status": "enabled"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Custom field created successfully.",
    "data": {
      "id": 8,
      "project_id": 1,
      "field_name": "Contract Value",
      "field_key": "contract_value",
      "field_type": "number",
      "is_required": false,
      "default_value": "0",
      "sort_order": 5,
      "status": "enabled"
    }
  }
  ```

### Update Custom Field (`PUT custom_fields.php`)
- **Request Body**:
  ```json
  {
    "id": 8,
    "field_name": "Premium Contract Value",
    "is_required": 1,
    "status": "enabled"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Custom field updated successfully."
  }
  ```

### Delete Custom Field (`DELETE custom_fields.php?id=<id>`)
*Note: Cascade deletes all values stored for this field across tasks.*
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Custom field deleted successfully."
  }
  ```

---

## 4. Tasks Endpoints (CRUD)

### Get Tasks List (`GET tasks.php?project_id=<id>`)
Returns task definitions and the task records matrix mapped with custom fields.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Tasks retrieved successfully.",
    "data": {
      "fields": [
        { "id": 1, "field_name": "Unit Number", "field_key": "unit_number", "field_type": "text" }
      ],
      "tasks": [
        {
          "id": 1,
          "project_id": 1,
          "task_status": "Completed",
          "created_at": "2026-05-24 12:00:00",
          "updated_at": "2026-05-24 12:00:00",
          "unit_number": "101"
        }
      ]
    }
  }
  ```

### Create Task (`POST tasks.php`)
Support both raw JSON payloads and `multipart/form-data` uploads.
- **Request Body (JSON)**:
  ```json
  {
    "project_id": 1,
    "task_status": "To Do",
    "custom_fields": {
      "unit_number": "105",
      "tenant_name": "Grace Hopper",
      "phone_number": "+971 50 111 2222",
      "call_status": "Follow-up Needed",
      "portal_status": "Not Registered"
    }
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Task created successfully.",
    "data": {
      "id": 6
    }
  }
  ```

### Update Task (`POST tasks.php?id=<id>` or JSON POST with `_method="PUT"`)
Handles updating core parameters and custom fields. File attachments should be sent as multipart parameters under the field's key.
- **Request Body (JSON)**:
  ```json
  {
    "id": 6,
    "_method": "PUT",
    "task_status": "In Progress",
    "custom_fields": {
      "call_status": "Re-scheduled",
      "follow_up_notes": "Postponed until Monday."
    }
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Task updated successfully.",
    "data": { "id": 6 }
  }
  ```

### Delete Task (`DELETE tasks.php?id=<id>`)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Task deleted successfully."
  }
  ```

---

## 5. Module Specific Endpoints

### Dashboard Metrics (`GET dashboard.php?project_id=<id>`)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Dashboard metrics retrieved successfully.",
    "data": {
      "metrics": {
        "total_tasks": 5,
        "portal_registered": 1,
        "portal_not_registered": 2,
        "portal_pending": 2,
        "calls_completed": 1,
        "progress_percentage": 20,
        "registration_rate": 20,
        "call_status_breakdown": {
          "Completed": 1,
          "Follow-up Needed": 1
        }
      },
      "recent_activities": [],
      "ai_insights": {
        "analytics": ["High pending registration rate detected: 40%."],
        "recommendations": ["Prioritize follow-up with pending registrations."]
      }
    }
  }
  ```

### Kanban Lanes (`GET kanban.php?project_id=<id>`)
Returns cards mapped with custom fields grouped by their task status.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Kanban columns retrieved successfully.",
    "data": {
      "To Do": [],
      "In Progress": [],
      "Completed": []
    }
  }
  ```

### Kanban Quick Update (`PUT kanban.php`)
Used to update a card's status instantly during drag operations.
- **Request Body**:
  ```json
  {
    "id": 1,
    "task_status": "In Progress"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Task column updated successfully."
  }
  ```

### Executive Reports (`GET reports.php?project_id=<id>&start_date=...`)
Supports filtering by `start_date`, `end_date`, `portal_status`, `call_status`, and `task_status`.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Report generated successfully.",
    "data": {
      "fields": [],
      "tasks": [],
      "summary": {
        "total": 5,
        "registered": 1,
        "progress_percent": 20
      }
    }
  }
  ```
