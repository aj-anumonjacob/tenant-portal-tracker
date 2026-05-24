# Tenant Portal Registration Tracker (ClickUp-like Workspace)

A complete, production-ready, ClickUp-like task tracking application specifically designed for tenant portal registration tracking. Built with **React.js** (frontend) and **PHP PDO REST API** (backend), using **MySQL** to store relational logs and dynamically configured fields via a highly flexible Entity-Attribute-Value (EAV) architecture.

## Key Features

1. **Flexible Project Architecture**: Support for multiple workspace projects. Create and isolate tracking logs for any number of projects.
2. **Advanced Custom Field (ACF) Builder**: Define text, number, date, dropdown options, radio buttons, checkboxes, email, phone, and file attachments dynamically per project.
3. **Dynamic Forms**: Auto-scaffolded task input drawer forms matching configured fields.
4. **Interactive Kanban Board**: Visual lanes (To Do, In Progress, Completed) featuring HTML5 drag-and-drop actions.
5. **AI Analytics & Smart Recommendations**: Rule-based system identifying registration barriers (e.g. invalid numbers, stuck pendings, low rates) and highlighting actionable suggestions.
6. **Executive Report Generator**: Comprehensive data tables with filtering by date range, portal state, call status, and task status.
7. **Premium Design System**: Glassmorphism aesthetic, dark/light theme toggle, custom badges, responsive layout, and a dedicated print CSS template for pixel-perfect PDF reporting.

---

## Directory Structure

```text
tenant-portal-tracker/
├── backend/                  # PHP REST API
│   ├── api/                  # REST Endpoint scripts (auth, tasks, projects, etc.)
│   ├── config/               # DB credentials, ENV loaders, helper utilities
│   ├── uploads/              # Storage directory for tenant uploaded files
│   ├── .env.example          # Environment configuration template
│   └── API_DOCS.md           # API request/response specification docs
├── database/                 # SQL Scripts
│   ├── schema.sql            # MySQL schema DDL
│   └── seed.sql              # Mock seed records (Tenant Portal defaults)
├── frontend/                 # Vite React Client app
│   ├── src/                  # React components, pages, design tokens
│   ├── vite.config.js        # Vite compiler configurations
│   └── package.json          # Node dependencies (recharts, lucide-react)
├── DEPLOYMENT.md             # VPS/cPanel hosting deployment guidelines
└── README.md                 # Project README (This file)
```

---

## Local Installation Guide

### Prerequisites
- **PHP 7.4 or higher**
- **MySQL 5.7 or higher**
- **Node.js 18 or higher** (for local frontend development)

---

### Step 1: Database Setup
1. Open your MySQL client (e.g., phpMyAdmin, MySQL Workbench, Command Line).
2. Create a new database:
   ```sql
   CREATE DATABASE tenant_tracker_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Import the schema DDL first:
   - Import the file located at: `database/schema.sql`
4. Import the sample seed data to pre-populate the "Tenant Portal" project, default custom fields, and dummy tasks:
   - Import the file located at: `database/seed.sql`

---

### Step 2: Backend REST API Configuration
1. Navigate to the `/backend` directory.
2. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit the `.env` file and configure your database parameters:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=tenant_tracker_db
   DB_USER=root
   DB_PASS=your_mysql_password
   JWT_SECRET=generate_a_random_jwt_key
   ALLOWED_ORIGIN=*
   ```
4. Start a local PHP server targeting the backend directory:
   ```bash
   # Run from the /backend directory:
   php -S localhost:8000
   ```
   *Your API endpoints will now be accessible at `http://localhost:8000/api/`.*

---

### Step 3: Frontend Client Setup
1. Navigate to the `/frontend` directory.
2. Install the package dependencies:
   ```bash
   npm install
   ```
3. Configure the environment endpoint:
   - Create a `.env` file in the `/frontend` directory:
     ```env
     VITE_API_URL=http://localhost:8000/api
     ```
4. Run the local development server:
   ```bash
   npm run dev
   ```
   *Open `http://localhost:5173` in your browser to interact with the application!*

---

## Default Demo Credentials

To test the application immediately with seeded mock data, authenticate using:
- **Username**: `admin`
- **Password**: `admin123`

---

## Production Deployment
For details on uploading your code and setting up the API endpoints on Hostinger, cPanel, or VPS environments, see [DEPLOYMENT.md](file:///C:/Users/anumo/.gemini/antigravity/scratch/tenant-portal-tracker/DEPLOYMENT.md).

## REST API Specification
For detailed guidelines on request parameters, JSON payloads, headers, and response formats, see [backend/API_DOCS.md](file:///C:/Users/anumo/.gemini/antigravity/scratch/tenant-portal-tracker/backend/API_DOCS.md).
