# SIH26264 AICTE Complaint Monitoring & Coordination System
## Public Production Deployment Guide

This guide provides the exact steps to deploy the system to **Supabase (PostgreSQL)**, **Render (Docker Backend)**, and **Vercel (React Frontend)**.

---

### Architecture Overview

```
                      +-----------------------------+
                      |       Vercel (Frontend)     |
                      |   React 19 + TypeScript     |
                      | https://<app>.vercel.app    |
                      +--------------+--------------+
                                     |
                          HTTPS REST / JWT Auth
                                     |
                                     v
                      +-----------------------------+
                      |       Render (Backend)      |
                      |     Dockerized FastAPI      |
                      | https://<backend>.onrender.com |
                      +--------------+--------------+
                                     |
                          SQLAlchemy Connection Pool
                                     |
                                     v
                      +-----------------------------+
                      |     Supabase (Database)     |
                      |    PostgreSQL 15+ (Cloud)   |
                      +-----------------------------+
```

---

### Step 1: Push Code to GitHub

1. Create a new repository on [GitHub](https://github.com/new) (e.g., `sih26264-complaint-system`).
2. Run the following commands in your local project terminal:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Set Up Supabase PostgreSQL

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project** and select your organization.
3. Name your project (e.g., `aicte-complaint-db`), set a strong database password, and choose a region close to your users (e.g., `ap-south-1` Mumbai or `ap-southeast-1` Singapore).
4. Once the project is provisioned (~1-2 minutes):
   - Go to **Project Settings** (gear icon at the bottom left) -> **Database**.
   - Under **Connection string**, select **URI**.
   - Copy the URI. It will look like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     ```
     *(Note: If using Transaction Pooler on port 6543, append `?sslmode=require`)*
   - Replace `[YOUR-PASSWORD]` with the database password you created in step 3.

---

### Step 3: Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign in.
2. Click **New +** -> **Web Service**.
3. Connect your GitHub account and select your `sih26264-complaint-system` repository.
4. Configure the service:
   - **Name**: `aicte-backend` (or your preferred name)
   - **Region**: Choose the region closest to your Supabase DB (e.g., Singapore or Frankfurt)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (or `backend` if deploying from subfolder; if left blank, Render uses the root `render.yaml` or specifies the Dockerfile path below)
   - **Runtime**: **Docker**
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Docker Context**: `backend`
   - **Instance Type**: **Free**
5. Under **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` | Your Supabase connection string |
   | `SECRET_KEY` | *(Generate a 64-char random hex string)* | Used for JWT signing |
   | `AUTO_SEED` | `true` | Auto-populates 40 institutions, 280 cases, and demo users on first startup |
   | `PORT` | `8000` | Render will automatically map this to its public router |
   | `BACKEND_CORS_ORIGINS` | `http://localhost:5173,https://*.vercel.app` | Allowed origins |
6. Click **Deploy Web Service**.
7. Once deployed, Render will provide a public URL (e.g., `https://aicte-backend.onrender.com`).
8. **Verify Backend Health**:
   - Open `https://<your-render-url>/health` in your browser. Expected: `{"status": "healthy", ...}`.
   - Open `https://<your-render-url>/docs` to view the interactive OpenAPI documentation.

---

### Step 4: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New...** -> **Project**.
3. Import your `sih26264-complaint-system` GitHub repository.
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Under **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_URL` | `https://<your-render-backend-url>/api/v1` | Your live Render backend API URL |
6. Click **Deploy**.
7. Vercel will build and assign a production URL (e.g., `https://aicte-complaint-system.vercel.app`).

---

### Step 5: Final Cross-Service Verification

1. **Verify CORS**:
   - In Render Dashboard, ensure `BACKEND_CORS_ORIGINS` contains your exact Vercel URL (e.g. `https://aicte-complaint-system.vercel.app`).
   - Note: The backend also has wildcard regex `^https://.*\.vercel\.app$` built-in, so all Vercel previews work automatically.
2. **Verify User Login**:
   - Open the live Vercel URL in your browser.
   - Log in using demo credentials:
     - **Username**: `rb_officer`
     - **Password**: `Password123!`
     *(Or test other roles: `ro_officer`, `institution_admin`, `senior_mgmt`, `chief_vigilance` with the same password)*
3. **Verify Core Features**:
   - **Dashboard**: Confirm KPI metric cards, overdue alert banners, and trend charts load.
   - **Cases List**: Verify pagination, filters, status badges, and severity indicators.
   - **Case Details**: Click into any case to check audit trail history and overlap detection explanation scores.
   - **Workflow Transition**: Execute a state change (e.g., transition `NEW` -> `UNDER_PRELIMINARY_EXAMINATION` or assign investigator).
   - **Institution 360**: Verify risk index scores and compliance charts.
   - **Reports**: Generate and download an executive summary report.
4. **Verify Database Persistence**:
   - Go to your Supabase Dashboard -> **Table Editor**.
   - Check tables `users`, `institutions`, `cases`, `case_activities` to verify newly created records and state transitions persist in PostgreSQL.
