# SORTv2 — Complete Codebase Audit & Gap Analysis

**Audit Date:** September 5, 2026  
**Scope:** Full codebase scan — hardcoded values, DepEd alignment, bugs, lapses, security, architecture  
**Status:** PLANNING ONLY — No implementation until review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Hardcoded Values Audit](#2-hardcoded-values-audit)
3. [DepEd Alignment Gaps](#3-deped-alignment-gaps)
4. [Security Concerns](#4-security-concerns)
5. [Architecture & Code Quality Issues](#5-architecture--code-quality-issues)
6. [Type/Schema Mismatches](#6-typeschema-mismatches)
7. [Missing Features](#7-missing-features)
8. [Regulatory Compliance](#8-regulatory-compliance)
9. [Action Plan — Prioritized](#9-action-plan--prioritized)

---

## 1. Executive Summary

SORTv2 is a well-structured waste management system for a DepEd school with EnrollPro integration, MRF operations, gamification, and school year rollover. However, the audit reveals **critical hardcoded values scattered across 30+ files**, **partial DepEd compliance**, and **missing regulatory reporting** that prevent it from being a production-ready, multi-deployment system.

**Overall Scores:**
| Area | Score |
|------|-------|
| Hardcoded Values | 3/10 — 50+ hardcoded values found |
| DepEd Alignment | 4.5/10 — Operational features good, regulatory gaps |
| Security | 5/10 — JWT auth solid, CORS/URLs exposed |
| Code Quality | 7/10 — Clean code, good error handling |
| Architecture | 7/10 — Monolith data hook needs refactoring |
| Schema Consistency | 4/10 — Frontend/backend type mismatches |

---

## 2. Hardcoded Values Audit

### 2A. Hardcoded GPS Coordinates (CRITICAL — 14+ files)

**Campus bounds are hardcoded to one specific school location across the entire frontend.**

```typescript
// Appears in 14+ files:
minLat: 14.5975, maxLat: 14.6035, minLng: 120.9815, maxLng: 120.9885
```

**Affected files:**
- `src/services/locationStore.ts:167`
- `src/pages/teacher/TeacherDashboard.tsx:61, 174-180, 213`
- `src/pages/student/StudentDashboard.tsx:139`
- `src/pages/mrf/MRFDashboard.tsx:961-963`
- `src/pages/student/components/BinMapTab.tsx:303`
- `src/pages/teacher/components/TeacherLocationSelector.tsx:128, 186, 296`
- `src/pages/student/components/ReportHistoryTab.tsx:251-253`
- `src/pages/student/components/SubmitReportTab.tsx:414, 476, 591`
- `src/pages/admin/components/AdminReportsTab.tsx:572-574`
- `src/pages/teacher/components/TeacherReportHistoryTab.tsx:164-166`

**Fix:** Store campus GPS bounds in `SystemSetting` or a dedicated `CampusConfig` table. Fetch on app load.

---

### 2B. Hardcoded Room Locations (24 rooms)

**File:** `src/services/locationStore.ts:8-33` and `server/prisma/seed.ts:316-341`

```
'Room 101 - Science Hall', 'Room 102 - Science Hall', ... 'Sports Complex Entrance B'
```

**Fix:** Seed from DB only. Remove frontend defaults. `locationStore.ts` should always fetch from backend.

---

### 2C. Hardcoded Campus Station Locations (5 stations)

**Files:** `src/services/locationStore.ts:64-130` and `server/prisma/seed.ts:243-310`

- `Main Courtyard (Quad)` — LOC-01
- `Science Hall Cafeteria Side` — LOC-02
- `Chemistry Building Entrance` — LOC-03
- `Main Library Lobby Entrance` — LOC-04
- `Sports Complex Entrance B` — LOC-05

**Fix:** All station data must come from the database. No frontend fallbacks.

---

### 2D. Hardcoded Point Values (CRITICAL — 10+ locations)

| File | Line(s) | Value | Issue |
|------|---------|-------|-------|
| `src/hooks/useMockData.tsx` | 615 | `rankPointsMap = [15, 10, 5]` | Should fetch from `PointRule` table |
| `src/hooks/useMockData.tsx` | 969 | `rankPointsMap = [15, 10, 5]` | Duplicate |
| `src/pages/student/components/SubmitReportTab.tsx` | 333 | `'1st: 15pts - 2nd: 10pts - 3rd: 5pts'` | UI text with hardcoded values |
| `src/pages/student/components/SubmitReportTab.tsx` | 799 | `'1st reporter = 15 pts, 2nd = 10 pts, 3rd = 5 pts'` | Hardcoded explanatory text |
| `src/pages/admin/components/AdminReportsTab.tsx` | 125, 149 | `'1st: 15 pts, 2nd: 10 pts, 3rd: 5 pts'` | Notification text |
| `src/pages/student/components/ReportHistoryTab.tsx` | 225 | `(rank === 1 ? 15 : rank === 2 ? 10 : rank === 3 ? 5 : 0)` | Fallback |
| `src/pages/admin/components/settings/AdminPointsSystemTab.tsx` | 15 | Default rules with 15, 10, 5 | Only UI defaults, OK if DB overrides |

**Fix:** All point values should be fetched from the `PointRule` table dynamically. Frontend should never hardcode point amounts in text strings.

---

### 2E. Hardcoded Default Vendor Name (7 locations)

`'GreenCycle Recycling Vendor'` appears in:
- `server/prisma/seed.ts:45`
- `server/src/routes/settings.routes.ts:31, 95`
- `server/src/routes/market.routes.ts:130`
- `src/hooks/useMockData.tsx:58`
- `src/hooks/useRecycleMarket.ts:198`
- `src/pages/mrf/MRFDashboard.tsx:178`

**Fix:** Store vendor name in `SystemSetting`. Fetch once, use everywhere.

---

### 2F. Hardcoded Default System Settings (3 locations)

Duplicated in:
- `server/prisma/seed.ts:30-47`
- `server/src/routes/settings.routes.ts:17-33 and 80-96`
- `src/hooks/useMockData.tsx:46-59`

Values repeated: `pointsPerReport: 50`, `pointsPerKgRecyclable: 10`, `warningThreshold: 3`, `certificatePointThreshold: 500`, `maxUnverifiedReports: 3`, `dismissPointPenalty: 10`, `falseReportPointPenalty: 50`, `warningAutoDeductAmount: 10`, `rewardsReservePercent: 20`

**Fix:** Single source of truth in DB. Frontend fetches from API. Remove all frontend defaults.

---

### 2G. Hardcoded Market Stock Categories (3 locations)

4 categories with hardcoded names, thresholds, and prices:
- `pet_plastic` — 50kg threshold, ₱18.0/kg
- `aluminum_cans` — 30kg threshold, ₱45.0/kg
- `cardboard` — 60kg threshold, ₱12.0/kg
- `glass` — 40kg threshold, ₱15.0/kg

**Files:** `server/prisma/seed.ts:469-474`, `server/src/routes/market.routes.ts:8-13`, `src/hooks/useRecycleMarket.ts:29-34`

**Fix:** All market stock categories should be configurable from the admin settings panel. No code-level defaults.

---

### 2H. Hardcoded URLs / API Endpoints (4 locations)

| File | Line | Value | Fix |
|------|------|-------|-----|
| `src/hooks/useMockData.tsx` | 780 | `http://localhost:5000/api/users/${userId}/warn` | Use `API_BASE_URL` from api.ts |
| `src/hooks/useMockData.tsx` | 847 | `http://localhost:5000/api/users/${userId}/deduct-points` | Use `API_BASE_URL` from api.ts |
| `src/pages/admin/components/settings/AdminAcademicCalendarTab.tsx` | 55 | `http://localhost:5000/api/sync/terms` | Use `API_BASE_URL` from api.ts |
| `src/services/api.ts` | 3 | `http://localhost:5000/api` (fallback) | OK as fallback, but document clearly |

**Fix:** All API calls must use the centralized `apiClient` or `API_BASE_URL` constant.

---

### 2I. Hardcoded Demo Credentials in Frontend

**File:** `src/components/landing/LoginCard.tsx:6-9`

```typescript
Student: identifier '100000000000', password 'DepEd2026!'
Teacher: identifier '1000018',      password 'DepEd2026!'
Admin:   identifier '1234501',      password 'DepEdSY2026!'
```

**Fix:** Remove demo credentials from production build. Make them environment-gated or remove entirely.

---

### 2J. Hardcoded Time Thresholds

| File | Line | Value | Issue |
|------|------|-------|-------|
| `src/utils/reportUtils.ts` | 3 | `SIX_HOURS_MS = 6 * 60 * 60 * 1000` | Report expiry — should be configurable |
| `src/hooks/useMockData.tsx` | 272 | `setInterval(syncBackendData, 2000)` | Polling interval — should be configurable |
| `src/hooks/useMockData.tsx` | 480 | `unverifiedReports.length >= 3` | Should use `SystemSetting.maxUnverifiedReports` |
| `server/src/routes/auth.routes.ts` | 10-11 | `15 min access, 7 day refresh` | OK as env vars but also hardcoded as fallback |
| `server/src/services/enrollpro-sync.service.ts` | 153 | `const limit = 200` | Pagination limit |

**Fix:** Move all thresholds to `SystemSetting` or environment variables.

---

### 2K. Hardcoded Academic Term Dates

**Files:** `server/_terms.ts`, `server/prisma/seed.ts`

```
Term 1: '2026-06-08' to '2026-09-15'
Term 2: '2026-09-16' to '2026-12-18'
Term 3: '2027-01-04' to '2027-04-08'
School year: '2026-2027'
```

**Fix:** These are seed data defaults only — acceptable for development. Verify they don't leak into production code.

---

### 2L. Hardcoded Challenge Definitions

**File:** `src/hooks/useMockData.tsx:66-70`

3 challenges with hardcoded titles, descriptions, and point awards (150, 200, 250 pts).

**Fix:** Move challenges to a database table (`Challenge` model exists in schema but is not used).

---

### 2M. Hardcoded Inventory Items

**File:** `server/prisma/seed.ts:492-501`

8 specific items: Digital Weighing Scale, Sorting Table, Baling Machine, Safety Gloves, etc.

**Fix:** Seed data only — acceptable. But add admin UI to manage inventory presets.

---

### 2N. Hardcoded "Peak Activity Time"

**File:** `src/pages/admin/AdminDashboard.tsx:275`

```typescript
'12:00 PM - 2:00 PM' // peak activity time
'2:15 PM'             // optimal dispatch window
```

**Fix:** Calculate dynamically from actual dispatch data.

---

### 2O. Hardcoded Unsplash Image URLs

**Files:** `src/pages/teacher/TeacherDashboard.tsx:51-56`, `src/pages/student/StudentDashboard.tsx:91-96`

6 hardcoded Unsplash URLs for waste category images.

**Fix:** Store image URLs in `WasteType` table or use a configurable asset CDN.

---

## 3. DepEd Alignment Gaps

### 3A. Waste Category Misalignment

**Schema enum (Prisma):** `RECYCLABLE, ORGANIC, HAZARDOUS, GENERAL`  
**Frontend type:** `RECYCLABLE, BIODEGRADABLE, NON_BIODEGRADABLE, ORGANIC, HAZARDOUS, GENERAL`  
**UI bins (actual user-facing):** Only `BIODEGRADABLE, NON_BIODEGRADABLE, RECYCLABLE`

**Critical issues:**
1. `HAZARDOUS` exists in schema but is **non-functional** — no bin type, no UI, students cannot report it
2. `RESIDUAL` (DepEd standard category) is **missing entirely**
3. `E-WASTE` (important for DepEd/DENR) is missing
4. Server `WasteCategory` enum and frontend `WasteCategory` type have **different values** — mapping exists in `report.routes.ts:93-100` but is fragile

**DepEd standard (DO 46, s. 2015):** Biodegradable, Non-biodegradable, Recyclable, Residual, Hazardous/Special

---

### 3B. Missing RA 9003 Compliance Features

Republic Act 9003 (Ecological Solid Waste Management Act) mandates:

| Requirement | Status | Notes |
|-------------|--------|-------|
| Waste segregation at source | PARTIAL | 3-stream only, missing Residual |
| MRF operations | GOOD | Full MRF portal implemented |
| Community-based waste management | PARTIAL | No community/parent module |
| Annual reporting to LGU | MISSING | No LGU reporting module |
| Sanitary landfill tracking | MISSING | No disposal destination tracking |
| Revenue sharing from recyclables | PARTIAL | Recycle market exists but no LGU share |
| penalties for non-compliance | PARTIAL | Offense system exists, not RA 9003-aligned |

---

### 3C. Missing DepEd-Specific Features

| Feature | Status | Priority |
|---------|--------|----------|
| Eco-Club Coordinator role | MISSING | HIGH |
| Environmental education modules | MISSING | HIGH |
| Standard DepEd report export (PDF/Excel) | MISSING | HIGH |
| Brigada Eskwela integration | MISSING | MEDIUM |
| Tree planting / NGP tracking | MISSING | MEDIUM |
| Student environmental portfolio | MISSING | MEDIUM |
| Division/Regional supervisor dashboard | MISSING | LOW |
| Parent/community engagement module | MISSING | LOW |
| DepEd LIS integration | MISSING | LOW |
| Carbon footprint calculation | MISSING | LOW |

---

### 3D. Missing Environmental Metrics

| Metric | Status |
|--------|--------|
| Waste diversion rate (%) | MISSING |
| Per-capita waste generation | MISSING |
| Landfill vs. diverted breakdown | MISSING |
| GHG/carbon equivalent calculations | MISSING |
| National benchmark comparisons | MISSING |
| LGU-required environmental compliance metrics | MISSING |

---

## 4. Security Concerns

### 4A. Hardcoded JWT Secret Fallback (CRITICAL)

**3 server files independently define the same fallback:**
- `server/src/routes/auth.routes.ts:9`
- `server/src/routes/user.routes.ts:8`
- `server/src/routes/sync.routes.ts:8`

```typescript
process.env.JWT_SECRET || 'sortv2_super_secret_jwt_key_2026'
```

**Risk:** If `JWT_SECRET` is not set, the app runs with a known secret. The `.env.example` also contains this value.

**Fix:** Fail hard if `JWT_SECRET` is not set. Never use a hardcoded fallback.

---

### 4B. CORS Wildcard

**File:** `server/src/index.ts:31`

```typescript
origin: '*'
```

**Risk:** Any domain can make authenticated requests to the API.

**Fix:** Use whitelist from environment variable: `ALLOWED_ORIGINS=http://localhost:5173,https://sort.yourschool.edu.ph`

---

### 4C. `.env` File Not in `.gitignore`

**File:** `.gitignore` only has `*.local` — the `server/.env` file with real credentials could be committed to git.

**Fix:** Add `.env` to `.gitignore` immediately.

---

### 4D. Hardcoded Credentials in `.env.example`

```bash
JWT_SECRET="sortv2_super_secret_jwt_key_2026"
```

**Fix:** Use placeholder: `JWT_SECRET="CHANGE_ME_BEFORE_DEPLOYMENT"`

---

### 4E. No Input Sanitization

Several POST routes trust `req.body` fields without sanitization:
- Report submission
- User warnings/deductions
- Settings updates

**Fix:** Add input validation middleware (e.g., `express-validator` or `zod`).

---

## 5. Architecture & Code Quality Issues

### 5A. `useMockData.tsx` — 1112 Lines (CRITICAL)

**File:** `src/hooks/useMockData.tsx`

This single file handles: login, report creation, point awarding, offense management, dispatch, bin sync, user management, settings management, and data polling. It is both a **state manager** and an **API client**.

**Impact:** Violates the 1000-line rule from AGENTS.md. Extremely difficult to maintain, test, or debug.

**Fix:** Split into:
- `useAuth.ts` — login, session, user profile
- `useReports.ts` — report CRUD, status updates, point logic
- `useBins.ts` — bin management and sync
- `useUsers.ts` — user listing, warnings, deductions
- `useSettings.ts` — system settings management
- `useDashboard.ts` — overview data aggregation

---

### 5B. `AdminDashboard.tsx` — 619 Lines

**File:** `src/pages/admin/AdminDashboard.tsx`

**Fix:** Extract chart components, metric calculations, and tab orchestration into sub-components.

---

### 5C. `settings.routes.ts` — 670 Lines (Backend)

**File:** `server/src/routes/settings.routes.ts`

Handles: system settings, preset groups, campus locations, room locations, asset categories, waste types, urgency levels, asset conditions, point rules, academic quarters, audit logs, campus news.

**Fix:** Split into separate route modules: `settings.routes.ts`, `presets.routes.ts`, `locations.routes.ts`, `categories.routes.ts`, `audit.routes.ts`, `news.routes.ts`.

---

### 5D. Frontend Has No Router

The app uses state-based routing (`App.tsx` manages view state). This means:
- No URL-based navigation
- No browser back/forward support
- No deep linking
- No route-level code splitting

**Fix (low priority):** Consider adding `react-router` for production use.

---

### 5E. Console.log Statements — 72 Total

**Frontend:** ~39 statements (mostly `console.warn`/`console.error` for API failures)  
**Backend:** ~33 statements (startup logs, seed logs, error handlers)

**Fix:** 
- Replace `console.log` in server code with a proper logger (e.g., `pino`, `winston`)
- Remove or gate frontend `console.warn` behind `NODE_ENV === 'development'`
- Seed script logs are acceptable

---

### 5F. No `.env.example` for Frontend

The frontend uses `VITE_API_URL` but there's no `.env.example` in the root directory to document this.

**Fix:** Create `/.env.example` with `VITE_API_URL=http://localhost:5000/api`

---

## 6. Type/Schema Mismatches

### 6A. WasteCategory Enum Mismatch (CRITICAL)

| Source | Values |
|--------|--------|
| Prisma schema | `RECYCLABLE, ORGANIC, HAZARDOUS, GENERAL` |
| Frontend type | `RECYCLABLE, BIODEGRADABLE, NON_BIODEGRADABLE, ORGANIC, HAZARDOUS, GENERAL` |
| UI bins | `BIODEGRADABLE, NON_BIODEGRADABLE, RECYCLABLE` |

Mapping exists in `report.routes.ts:93-100` via `mapWasteCategory()` but:
- Frontend sends `BIODEGRADABLE` → server maps to `ORGANIC`
- Frontend sends `NON_BIODEGRADABLE` → server maps to `GENERAL`
- Server sends `HAZARDOUS` → frontend doesn't know how to display it

**Fix:** Align enums across all layers. Use the same values everywhere.

---

### 6B. Missing `Challenge` Table Usage

The `Challenge` model exists in Prisma schema but the frontend (`useMockData.tsx:66-70`) uses hardcoded challenge objects instead of fetching from the database.

**Fix:** Wire up the `Challenge` model to the frontend via API.

---

### 6C. `ReportType` Enum Unused

`ReportType` enum exists (`WASTE, ASSET`) but the teacher report system uses a separate `itemCategory` string field instead.

**Fix:** Consolidate report typing.

---

## 7. Missing Features (By Priority)

### CRITICAL (Must-Have for Production)

| # | Feature | Why |
|---|---------|-----|
| 1 | Dynamic GPS bounds from DB | Can't deploy to another school |
| 2 | Dynamic point values from DB | Hardcoded values override admin settings |
| 3 | Dynamic room/station locations from DB | Location store has hardcoded fallbacks |
| 4 | Proper 5-stream waste categories | DepEd DO 46 compliance |
| 5 | JWT secret must not have fallback | Security vulnerability |
| 6 | CORS whitelist | Security vulnerability |
| 7 | Input validation/sanitization | Security vulnerability |
| 8 | `.env` in `.gitignore` | Credential leak risk |

### HIGH (Should-Have for DepEd Alignment)

| # | Feature | Why |
|---|---------|-----|
| 9 | DepEd report export (PDF/Excel) | Required for Division Office submission |
| 10 | Waste diversion rate metric | Core environmental KPI |
| 11 | Hazardous waste reporting workflow | Safety compliance |
| 12 | LGU reporting module | RA 9003 requirement |
| 13 | Environmental education content | DepEd DO 46 requirement |
| 14 | Eco-Club Coordinator role | DepEd organizational requirement |
| 15 | Dynamic vendor name from settings | 7 hardcoded locations |
| 16 | Dynamic system settings (no frontend defaults) | Settings duplication issue |

### MEDIUM (Nice-to-Have)

| # | Feature | Why |
|---|---------|-----|
| 17 | Brigada Eskwela integration | DepEd flagship program |
| 18 | Tree planting / NGP tracking | DepEd environmental mandate |
| 19 | Student environmental portfolio | Co-curricular records |
| 20 | Parent/community engagement module | Community-based waste management |
| 21 | Dynamic challenge system (use DB) | Challenge model exists but unused |
| 22 | Carbon footprint calculations | Modern environmental reporting |
| 23 | Split `useMockData.tsx` into smaller hooks | Code quality (1000+ line rule) |
| 24 | Split `settings.routes.ts` into smaller modules | Backend maintainability |

### LOW (Future Enhancements)

| # | Feature | Why |
|---|---------|-----|
| 25 | React Router for URL-based navigation | UX improvement |
| 26 | Division/Regional multi-school dashboard | Scalability |
| 27 | Mobile app (React Native) | Accessibility |
| 28 | Proper logging service (pino/winston) | Production readiness |
| 29 | DepEd LIS integration | National system alignment |
| 30 | Benchmarking against other schools | Competitive improvement |

---

## 8. Regulatory Compliance

| Law/Regulation | Status | Gaps |
|----------------|--------|------|
| **RA 9003** (Ecological Solid Waste Management Act) | PARTIAL | MRF good, segregation simplified, no LGU reporting |
| **PD 825** (Prohibition Against Littering) | PARTIAL | Reporting exists, no enforcement tracking |
| **RA 8749** (Philippine Clean Air Act) | NOT IMPLEMENTED | No air quality monitoring |
| **RA 6969** (Toxic Substances Act) | NOT IMPLEMENTED | Hazardous waste enum exists but non-functional |
| **RA 9275** (Clean Water Act) | NOT IMPLEMENTED | No water pollution tracking |
| **DepEd Order 46, s. 2015** | PARTIAL | Waste management exists but not DO 46 aligned |
| **DepEd Order 18, s. 2018** | NOT IMPLEMENTED | No Brigada Eskwela module |

---

## 9. Action Plan — Prioritized

### Phase 1: Critical Fixes (Week 1-2)

- [ ] **[SECURITY]** Remove hardcoded JWT secret fallback — fail if env var not set
- [ ] **[SECURITY]** Replace CORS `*` with configurable whitelist
- [ ] **[SECURITY]** Add `.env` to `.gitignore`
- [ ] **[SECURITY]** Add input validation middleware (zod/express-validator)
- [ ] **[DYNAMIC]** Move GPS bounds to `SystemSetting` table, remove all hardcoded coordinates
- [ ] **[DYNAMIC]** Move room locations and station data to DB-only (remove frontend defaults)
- [ ] **[DYNAMIC]** Fetch point values from `PointRule` table in frontend — no hardcoded fallbacks
- [ ] **[DYNAMIC]** Move vendor name to `SystemSetting`, fetch dynamically
- [ ] **[DYNAMIC]** Remove hardcoded system settings defaults from frontend — use API only
- [ ] **[DYNAMIC]** Fix all `localhost:5000` hardcoded URLs to use `API_BASE_URL`
- [ ] **[SCHEMA]** Align `WasteCategory` enum between Prisma and frontend types
- [ ] **[CLEANUP]** Create root `.env.example` for frontend `VITE_API_URL`
- [ ] **[CLEANUP]** Remove demo credentials from `LoginCard.tsx` or gate behind env var

### Phase 2: DepEd Alignment (Week 3-4)

- [ ] Expand waste categories to DepEd 5-stream: Biodegradable, Non-biodegradable, Recyclable, Residual, Hazardous
- [ ] Implement hazardous waste reporting workflow (students can report, MRF handles)
- [ ] Add Eco-Club Coordinator role
- [ ] Build DepEd report export module (PDF/Excel generation)
- [ ] Add waste diversion rate calculation to analytics
- [ ] Create environmental education content section
- [ ] Wire up `Challenge` model from database instead of hardcoded values
- [ ] Calculate "Peak Activity Time" dynamically from dispatch data
- [ ] Move Unsplash image URLs to configurable assets in `WasteType` table

### Phase 3: Architecture (Week 5-6)

- [ ] Split `useMockData.tsx` (1112 lines) into focused hooks: `useAuth`, `useReports`, `useBins`, `useUsers`, `useSettings`, `useDashboard`
- [ ] Split `settings.routes.ts` (670 lines) into separate route modules
- [ ] Replace `console.log` with structured logger (pino/winston) on backend
- [ ] Gate frontend `console.warn` behind `NODE_ENV`
- [ ] Add React Router for URL-based navigation and code splitting

### Phase 4: Advanced Features (Week 7+)

- [ ] LGU/Barangay reporting module
- [ ] Brigada Eskwela integration
- [ ] Tree planting / NGP tracking
- [ ] Student environmental portfolio
- [ ] Parent/community engagement module
- [ ] Carbon footprint calculations
- [ ] Multi-school / Division dashboard
- [ ] DepEd LIS integration

---

*This audit document should be reviewed and approved before any implementation begins. All changes must follow the design tokens and coding guidelines in AGENTS.md.*
