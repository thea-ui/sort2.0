# 🌿 SORTv2 — Smart Waste Management & Sustainability Platform

Welcome to **SORTv2**! A modern, next-generation campus waste management and sustainability platform designed for real-time waste reporting, Material Recovery Facility (MRF) dispatch, gamified student eco-points, and administrative analytics.

---

## 🎯 Tech Stack

- **Frontend:** React 19 (TypeScript) + Vite + TailwindCSS 4 + Lucide React
- **Backend:** Node.js + Express (TypeScript) + JWT Authentication
- **Database & ORM:** PostgreSQL + Prisma ORM
- **Linting & Code Quality:** oxlint

---

## 🔑 Test Account Credentials (Testing Phase)

The database seed script automatically creates **7 default accounts** with simple credentials for rapid multi-role testing:

| Role | Full Name | Email | Default Password | Details / Assigned Role |
| :--- | :--- | :--- | :--- | :--- |
| 🎓 **Student 1** | Alex Rivera | `student1@sort.edu` | `student123` | BSIT-3A (150 pts, 2 Badges) |
| 🎓 **Student 2** | Beatriz Santos | `student2@sort.edu` | `student123` | BSIT-3B (320 pts, 2 Badges) |
| 🎓 **Student 3** | Carlos Mendoza | `student3@sort.edu` | `student123` | BSIT-3A (80 pts, 1 Warning) |
| 👩‍🏫 **Teacher** | Prof. Eleanor Vance | `teacher1@sort.edu` | `teacher123` | BSIT-3A Class Advisor |
| 🛠️ **Admin** | System Administrator | `admin@sort.edu` | `admin123` | System SuperAdmin |
| 🚚 **MRF Staff 1** | Marcus Vance | `mrf1@sort.edu` | `mrf123` | MRF Team Alpha (Dispatch) |
| 🚚 **MRF Staff 2** | Sarah Connor | `mrf2@sort.edu` | `mrf123` | MRF Team Beta (Dispatch) |

---

## 🏛️ System Architecture & Features

### 🎓 Student Portal
- **Waste Reporting:** Interactive camera upload, geolocation pin, category selection (Recyclable, Organic, Hazardous, General).
- **Gamification:** Eco-points leaderboard, milestone badges, active weekly challenges.
- **Activity Log:** Comprehensive history of submitted reports and status updates.

### 👩‍🏫 Teacher Portal
- **Classroom Overview:** Sustainability analytics for assigned class sections.
- **Report Verification:** Track student contributions and report accuracy.

### 🛠️ Admin Portal
- **Dashboard Analytics:** Real-time metrics for overall campus waste diverted, active dispatches, and user participation.
- **Role & User Management:** User directory, warning/offense issuance system.
- **System Settings:** Configure points per report, kg multipliers, and certificate thresholds.

### 🚚 MRF Staff Portal
- **Interactive Bin Map:** Live monitoring of campus waste bins and fill levels.
- **Dispatch Management:** Route planning, task assignment, weight (kg) collection logging, and report verification.

---

## 🐘 PostgreSQL & Backend Setup

For detailed step-by-step PostgreSQL installation, pgAdmin database creation, and configuration, please refer to [`POSTGRES_SETUP.md`](./POSTGRES_SETUP.md).

### Quickstart Backend Instructions:
1. Ensure PostgreSQL is running locally on port `5432` and create database `sortv2_db`.
2. Configure `.env` in the `server/` directory:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/sortv2_db?schema=public"
   PORT=5000
   JWT_SECRET="sortv2_super_secret_jwt_key_2026"
   ```
3. Run database migrations & seed test accounts:
   ```bash
   cd server
   npm install
   npx prisma db push
   npx prisma db seed
   npm run dev
   ```

---

## 🚀 Frontend Getting Started

To run the frontend React Vite development server:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Vite development server:**
   ```bash
   npm run dev
   ```

3. **Build production bundle:**
   ```bash
   npm run build
   ```

4. **Lint codebase:**
   ```bash
   npm run lint
   ```

---

## 📐 Engineering Guidelines

This repository strictly adheres to guidelines in [`.agents/AGENTS.md`](./.agents/AGENTS.md):
1. **File Size Limits:** No single source code file may approach or exceed **1,000 lines**.
2. **Database Best Practices:** Enforced `snake_case` table naming, UUID primary keys, bcrypt password hashing, and version-controlled Prisma migrations.
3. **Design System Tokens:** Modern organic background `#F9F3F0`, evergreen headings `#00271D`, luminous action buttons `#00A77C`, and 2026 rounded border radius system.
4. **No Raw Emojis Rule:** Only crisp Lucide React SVG icons in UI interfaces.
