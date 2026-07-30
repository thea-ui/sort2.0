# 🐘 PostgreSQL Database Setup & Credential Guide for SORTv2

This document provides a simple, step-by-step guide for configuring PostgreSQL, running database migrations, seeding test accounts, and connecting the backend service.

---

## 🔑 1. Pre-Configured Test Accounts (Testing Phase)

The database seed script automatically creates **7 default accounts** with simple credentials for rapid testing across all roles:

| Role | Full Name | Email | Password | Assigned Section / Note |
| :--- | :--- | :--- | :--- | :--- |
| 🎓 **Student 1** | Alex Rivera | `student1@sort.edu` | `student123` | BSIT-3A (150 pts) |
| 🎓 **Student 2** | Beatriz Santos | `student2@sort.edu` | `student123` | BSIT-3B (320 pts) |
| 🎓 **Student 3** | Carlos Mendoza | `student3@sort.edu` | `student123` | BSIT-3A (80 pts) |
| 👩‍🏫 **Teacher** | Prof. Eleanor Vance | `teacher1@sort.edu` | `teacher123` | BSIT-3A Advisor |
| 🛠️ **Admin** | System Administrator | `admin@sort.edu` | `admin123` | System SuperAdmin |
| 🚚 **MRF Staff 1** | Marcus Vance | `mrf1@sort.edu` | `mrf123` | MRF Team Alpha |
| 🚚 **MRF Staff 2** | Sarah Connor | `mrf2@sort.edu` | `mrf123` | MRF Team Beta |

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
JWT_SECRET="sortv2_super_secret_jwt_key_2026"
NODE_ENV="development"
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

3. **Seed Database with Test Accounts & Sample Data:**
   ```bash
   npx prisma db seed
   ```

4. **Start Backend Express Server:**
   ```bash
   npm run dev
   ```
   The backend API server will run at `http://localhost:5000`.

---

## 📡 5. Backend API Endpoints Overview

- **Auth:**
  - `POST /api/auth/login` (Body: `{ email, password }`)
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
