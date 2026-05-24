# Production & Free Hosting Deployment Guide

This guide walks through deploying the React frontend and PHP REST API. We cover both professional paid hosting (hPanel/cPanel) and a **100% Free Hosting Stack** using **Vercel** (for the frontend) and **InfinityFree** (for the PHP/MySQL backend).

---

## 1. Hosting Architecture (Free Tier)

```text
                               +-----------------------------+
                               |     User Web Browser        |
                               +-----+-----------------+-----+
                                     |                 |
         Load HTML/CSS/JS (HTTPS)    |                 | REST API requests (HTTPS CORS)
                                     v                 v
                       +-------------+----+     +------+---------------------+
                       |  Vercel Hosting  |     | InfinityFree (Free cPanel) |
                       |                  |     |                            |
                       |  React Frontend  |     | PHP REST API /backend      |
                       +------------------+     +--------------+-------------+
                                                               |
                                                               | PDO Connection
                                                               v
                                                        +------+-------------+
                                                        | MySQL Database     |
                                                        +--------------------+
```

---

## 2. Pushing Your Code to GitHub (Prerequisite)

Before hosting, push your local code directory to a GitHub repository:

1. Open your terminal in the root directory: `C:\Users\anumo\.gemini\antigravity\scratch\tenant-portal-tracker`
2. Run the following Git commands:
   ```bash
   # Initialize local git repository
   git init

   # Create a .gitignore file in the root
   echo "node_modules/\n.env\ndist/\nuploads/*" > .gitignore

   # Add files and commit
   git add .
   git commit -m "Initial commit of clickup tenant tracker"

   # Rename branch to main
   git branch -M main
   ```
3. Go to [GitHub](https://github.com), create a new **public or private repository** named `tenant-portal-tracker`.
4. Link your local directory to GitHub and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/tenant-portal-tracker.git
   git push -u origin main
   ```

---

## 3. Hosting the Backend (PHP & MySQL) for FREE

We will use **InfinityFree** (100% free web hosting with PHP, MySQL, cPanel, and SSL support).

### Step 1: Sign up and Initialize Account
1. Visit [InfinityFree](https://infinityfree.com) and create a free account.
2. Click **Create Account** in the client area.
3. Choose a custom free subdomain (e.g. `tenant-api.infinityfreeapp.com`).
4. Set up an account password and click create.

### Step 2: Set up the MySQL Database
1. From the InfinityFree client dashboard, open the **Control Panel** (cPanel).
2. Go to **MySQL Databases**.
3. Create a new database (e.g. `ifxxx_tenant_db`).
4. Copy down the database connection details:
   - **MySQL Hostname** (e.g. `sql123.infinityfree.com`)
   - **MySQL Username** (e.g. `ifxxx_xxxxxx`)
   - **MySQL Password** (retrieve from client dashboard)
   - **Database Name** (e.g. `ifxxx_tenant_db`)
5. Open **phpMyAdmin** in cPanel:
   - Select your database.
   - Go to the **Import** tab.
   - Select and upload `database/schema.sql`.
   - Once completed, do the same to import `database/seed.sql` (to populate initial projects, fields, and tasks).

### Step 3: Upload PHP API files
1. Open the **Online File Manager** in the cPanel or use an FTP client (like FileZilla).
2. Navigate to the `htdocs` directory.
3. Upload the contents of your `/backend` folder (including `api/`, `config/`, and `uploads/`) directly into a folder named `api` inside `htdocs` (so path is `htdocs/api/`).
4. Create a `.env` file inside `htdocs/api/` (using the online file editor) and input the database connection details:
   ```env
   DB_HOST=sql123.infinityfree.com
   DB_PORT=3306
   DB_NAME=ifxxx_tenant_db
   DB_USER=ifxxx_xxxxxx
   DB_PASS=your_cpanel_database_password
   JWT_SECRET=your_secret_key_string
   ALLOWED_ORIGIN=*
   ```
5. Ensure the `htdocs/api/uploads` folder has write permissions (normally **0755**).
6. Verify access: visit `http://YOUR_SUBDOMAIN.infinityfreeapp.com/api/api/projects.php` in your browser. It should output a JSON message:
   ```json
   {"success":false,"message":"Access Denied: Missing Authorization Token."}
   ```
   *Take note of this URL; this is your production API Base URL!*

---

## 4. Hosting the Frontend (React.js) for FREE

We will use **Vercel** (the best free hosting provider for React apps, with automatic client-side SPA routing support).

### Step 1: Add Vercel config
To ensure React Router and page refreshes work correctly, create a `vercel.json` file in your `/frontend` directory:
- [NEW] Create [frontend/vercel.json](file:///C:/Users/anumo/.gemini/antigravity/scratch/tenant-portal-tracker/frontend/vercel.json):
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```

### Step 2: Import Project to Vercel
1. Sign up for a free account on [Vercel](https://vercel.com) using your GitHub account.
2. In the Vercel Dashboard, click **Add New** > **Project**.
3. Import your `tenant-portal-tracker` repository from GitHub.
4. **Configure Project Settings**:
   - **Root Directory**: Select `frontend` (since the repository has root-level directories).
   - **Build & Development Settings**: Vercel automatically detects **Vite** and sets build commands to `npm run build` and output directory to `dist`. Keep these defaults.
   - **Environment Variables**: Add a new environment variable:
     - **Key**: `VITE_API_URL`
     - **Value**: `http://YOUR_SUBDOMAIN.infinityfreeapp.com/api/api` (the URL pointing to your backend htdocs/api folder).
5. Click **Deploy**. Vercel will build and launch your React frontend. It will provide a free deployment URL (e.g. `https://tenant-portal-tracker.vercel.app`).

Open this Vercel URL in your browser, log in with `admin` / `admin123`, and your live, fully functional ClickUp-like tenant tracker is ready to go!
