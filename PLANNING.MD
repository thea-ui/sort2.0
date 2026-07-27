# 🚀 SORTv2 Master Architecture & Planning Blueprint

## 🎯 Technical Constraints & Stack
- **Frontend:** React 19 (TypeScript) + Vite + TailwindCSS + shadcn/ui
- **Backend:** Node.js + Express (TypeScript) + Prisma ORM (Architecture TBD: Monolith vs Microservices)
- **Database:** PostgreSQL
- **Strict Optimization Rule:** No single file should approach or exceed 1,000 lines of code. Split features into modular controllers, custom React hooks, and atomic UI sub-components.
- **Current Phase Boundary:** UI Overhaul Phase. Net connections and real-time streaming (SSE) are currently omitted. The UI will utilize localized mock-data abstractions or local state handlers to oversee structural functions before database/network connection.

---

## 🏗️ 1. Database Models & Relations (Prisma/Postgres)

### Enums
- `Role`: `STUDENT`, `TEACHER`, `MRF`, `ADMIN`
- `ReportStatus`: Operational tracking states for waste/asset management.

### Core Entities
- **User:** Auth profiles, metadata mapping to internal employee IDs, and gamification tracking (points metrics, certificates metadata).
- **Report:** Workflow transactions capturing report status, dynamic urgencies, coordinates/location targets, and associated points state.
- **WasteCollection:** Audit entries capturing logs of kilograms collected per waste type variant.
- **Challenge / UserChallenge:** System-managed tasks mapped to progress trackers tracking gamified goals.
- **PointHistory:** Periodic snapshots tracking historic trends for user leaderboard positions.
- **Offense:** Logged infractions tracking warning limits or platform access restrictions for faulty input.
- **Location / BinStatus:** Physical location lookups and live structural states mapping fill states or availability attributes.
- **SystemSettings:** Global configuration properties storing point scales, certificates requirements, and hard limits.
- **Session:** Multi-device validation table hashing secure sign-ins for validation processing.
- **SmartCalendar / Sync Log Tables:** Mirror components managing calendar data boundaries and system synchronizations.

---

## 🔐 2. RBAC & Frontend View Permissions

### Role-Based Access Control (RBAC) View Rules
- **STUDENT:** Can execute new reports, review their historical timeline, monitor performance dashboards, track challenges, and verify certificate criteria. Restrained from operational platform configurations. Restricted by mock Quarter Gate validation checks.
- **TEACHER:** Inherits basic execution rights, expanded handling for classroom asset criteria, dashboard monitoring, and active mapping grids.
- **MRF (Staff):** System monitoring view access, handle active dispatches, register payload collections (tracking weights), update target container availability levels, and evaluate key operation metrics.
- **ADMIN:** Unrestricted administrative configurations, drop existing cache mappings, handle leaderboards data, invoke mock external data system syncs, review system tracking streams, and execute override cleanups.

---

## 🔌 3. Backend Route & Module Breakdown (Design Phase Only)
*Note: Network connection routes are on hold pending structural decisions. Frontends will simulate interactions with these structures.*
- `/api/auth`: Sign-in, multi-device listing, profile views, leaderboards.
- `/api/reports`: Payload submissions, history queues, analytical counters, operational flow updates (dispatch workflows, recording asset/weight parameters). 
- `/api/settings`: Master tables updates, configuration updates, tracking logs.
- `/api/map`: Interactive resource updates, location metadata maps, container parameters.
- `/api/challenges`: Active program lookups.
- `/api/news`: Message logs and campus articles.

---

## 🎨 4. Frontend Views & Reusable Components (Current Focus)

### Dashboard Deconstruction Plan (Atomic Components)
- **Landing UI:** Resource charts module, simulated leaderboard listings, static notification timelines.
- **Student & Teacher UI:** Mobile-first workspace tabs, asset photo capture forms (mock camera components), gamified status indicators, local state calendar components.
- **MRF Personnel UI:** Route guidance mock interfaces, weight load input matrices, real-time status UI toggles.
- **Admin Hub:** Multi-tab analytical controls, system management matrices, settings input modules, visual activity logs.

---

## 🚀 AI Agent Execution Prompt (Context Anchoring)
> **When modifying or creating code in this project, read this file first.** Focus purely on UI/UX scaffolding, TypeScript interfaces, and layout building using React 19, Tailwind, and shadcn/ui. Network fetching operations should be abstracted into mock hooks (`useReports`, `useAuth`) so that backend integration can be dropped in later without altering the visual structure. Keep all UI components atomic and strictly under 1,000 lines.
Based on the Master Architecture & Planning Blueprint provided above, please initialize Phase 1: Frontend UI Setup.

To keep the project highly optimized and strictly adhere to our <1,000 lines rule, please generate the foundational code blocks for:

1. `src/types/index.ts` - All core TypeScript interfaces (User, Report, Role enum, BinStatus, etc.).
2. `src/hooks/useMockData.ts` - Reusable React custom hooks providing stateful mock engines (like useMockAuth, useMockReports) so the UI acts functional without a backend network layer.
3. `src/components/layout/DashboardLayout.tsx` - The responsive shell layout with dynamic sidebar links that adapt to the logged-in User's Role.

Please output only clean, highly modular TypeScript/React 19 code blocks for these files.
