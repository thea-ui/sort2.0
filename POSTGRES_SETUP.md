# 🐘 PostgreSQL Database Setup & Credential Guide for SORTv2

This document provides a simple, step-by-step guide for configuring PostgreSQL, running database migrations, seeding test accounts, and connecting the backend service.

---

## 🔑 1. Authentication & Login

SORTv2 uses **delegated authentication** via EnrollPro. All user accounts are synced from EnrollPro, and passwords are validated against EnrollPro's authentication service — no local password storage.

- **Students:** Login with your LRN (Learner Reference Number) + EnrollPro password
- **Staff (Teachers/Admin/MRF):** Login with your Employee ID + EnrollPro password

> Password changes must be done through EnrollPro. The local system does not store or manage passwords.

---

## 🛠️ 2. PostgreSQL Quickstart Setup Instructions

### Option A: Using pgAdmin 4 (GUI)
1. Open **pgAdmin 4** from your Start Menu.
2. Enter your Master Password to unlock pgAdmin.
3. In the left panel, expand **Servers** -> **PostgreSQL** (e.g., PostgreSQL 15 or 16).
4. Enter your `postgres` superuser password if prompted.
5. Right-click on **Databases** -> Select **Create** -> **Database...**
6. Type Database name: `sortv2_db` and click **Save**.

### Option B: Using SQL / `psql` Terminal
Open PowerShell or Command Prompt and run:
```bash
psql -U postgres
```
*(Enter your postgres superuser password when prompted)*

Then run the following SQL query:
```sql
CREATE DATABASE sortv2_db;
```

---

## ⚙️ 3. Environment Variable Configuration (`server/.env`)

In the `server/` directory, open `.env` (or copy `.env.example` to `.env`) and update your database connection string:

```env
# Change 'postgres:YOUR_POSTGRES_PASSWORD' to match your actual PostgreSQL password
DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/sortv2_db?schema=public"

PORT=5000
JWT_SECRET="your_jwt_secret_here"
NODE_ENV="development"

# EnrollPro Integration
ENROLLPRO_BASE_URL="https://your-enrollpro-instance.com/api"
ENROLLPRO_SYNC_SECRET="your_integration_key_here"
```

---

## 🚀 4. Running Migrations & Seeding Database

Open a terminal in the `server` directory and execute:

1. **Install Server Dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Push Database Schema & Generate Prisma Client:**
   ```bash
   npx prisma db push
   ```

3. **Seed Database with System Settings & Sample Data:**
   ```bash
   npx prisma db seed
   ```

4. **Start Backend Express Server:**
   ```bash
   npm run dev
   ```
   The backend API server will run at `http://localhost:5000`.

---

## 🔄 5. EnrollPro Sync Commands

- **Bulk sync (CLI):** `npm run sync:enrollpro` — pulls all users and term calendars from EnrollPro
- **Wipe accounts:** `npm run db:wipe-accounts` — deletes all users, sessions, and user-owned data (keeps bins, settings, inventory)
- **Fresh start:** Run wipe → then sync:
  ```bash
  cd server
  npm run db:wipe-accounts
  npm run sync:enrollpro
  ```

---

## 📡 6. Backend API Endpoints Overview

- **Auth:**
  - `POST /api/auth/login` (Body: `{ identifier, password }`)
  - `GET /api/auth/me` (Header: `Authorization: Bearer <token>`)
- **Users & Leaderboard:**
  - `GET /api/users`
  - `GET /api/users/leaderboard`
- **Waste Reports:**
  - `GET /api/reports`
  - `POST /api/reports`
  - `PATCH /api/reports/:id/status`
- **Waste Bins:**
  - `GET /api/bins`
  - `PATCH /api/bins/:id`
- **Sync:**
  - `POST /api/sync/all` (Admin only — trigger full sync)
  - `GET /api/sync/status` (Admin only — view sync history)
