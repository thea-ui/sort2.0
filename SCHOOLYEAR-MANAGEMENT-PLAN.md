# School Year Management Plan

> **Status:** Planning only. No implementation is authorized by this document.
> **Scope:** Admin management, EnrollPro synchronization, rollover safety, and school-year-scoped reporting.

## 1. Purpose And Success Criteria

School years are the boundary for reports, points, offenses, sales, inventory transactions, audit logs, and rollover snapshots. The feature must make that boundary explicit and safe without allowing an admin to accidentally reset operational data.

Success means:

- Exactly one non-archived school year can be active at a time.
- Every user-initiated create, update, activate, deactivate, and rollover operation is validated server-side and authorized for admins; the automated sync path is restricted to its service boundary.
- Automatic EnrollPro rollover remains the source of truth for linked school years.
- Manual creation is possible without silently activating or resetting a year.
- Rollover is not available as a normal production UI action.
- Existing records are not silently reassigned to a different school year.
- The UI clearly distinguishes active, inactive, and archived years and handles loading, empty, validation, and API error states.

## 2. Confirmed Current State

### Existing implementation

- `SchoolYear` uses UUID `id`, optional unique `enrollproId`, `label`, `startDate`, `endDate`, `isActive`, `isArchived`, `archivedAt`, and `createdAt`.
- `GET /api/school-years` lists years with counts for reports, point histories, offenses, and sales.
- `GET /api/school-years/active` returns the first row where `isActive = true` and `isArchived = false`.
- `GET /api/school-years/:id` returns snapshot data, top point snapshots, and aggregate counts.
- `POST /api/school-years` currently supplies defaults, performs minimal validation, and creates every new year as active.
- `POST /api/school-years/:id/archive` actually performs a full rollover through `executeRollover`.
- EnrollPro sync calls `ensureSchoolYear`; a new EnrollPro ID can trigger automatic rollover.
- The frontend already has `createSchoolYear` and `archiveSchoolYear` API methods, but the hook exposes only archive and detail operations.
- `AdminSchoolYearTab` currently exposes `Trigger Rollover` directly in the active-year card.

### Known risks and gaps

- School-year routes currently have no authentication or admin authorization guard, unlike user and sync routes.
- Multiple rows can become active because the database has no active-year uniqueness constraint and create sets `isActive = true`.
- Label uniqueness is not enforced. Date ranges are not validated for ordering or overlap.
- The current rollover is a multi-step operation without one database transaction. A mid-operation failure can leave snapshots, flags, balances, and inventory in an inconsistent state.
- Rollover tags all null-school-year records to the current year. That is an irreversible data decision and must be audited before changing it.
- `isActive` and `isArchived` are independent booleans, so their valid combinations and transitions are currently implicit.
- There is no defined audit actor for manual admin operations; the current rollover audit entry uses `System`.
- A header such as `X-Test-Mode` is not a security boundary and must not be used to protect a destructive endpoint.

## 3. Lifecycle Contract

Use the existing fields initially; do not add a separate status enum unless the implementation proves the boolean model cannot enforce these rules.

| State | `isActive` | `isArchived` | Meaning | Allowed transitions |
|---|---:|---:|---|---|
| Active | `true` | `false` | Current operational year | Deactivate only after another year is selected; archive only through rollover |
| Inactive | `false` | `false` | Created or paused, not current | Activate, edit, or remain inactive |
| Archived | `false` | `true` | Closed historical year with snapshots | Read-only; no activation or editing in v1 |

Rules:

- Never allow `isActive = true` and `isArchived = true`.
- Never allow more than one active, non-archived year.
- A new manually created year is inactive by default.
- An archived year is immutable in v1. Do not introduce an "unarchive" action without a data-repair design.
- Deactivating the current year requires an atomic replacement active year in the same operation. If no replacement exists, reject the request.
- EnrollPro-linked years cannot be manually activated in a way that conflicts with the current EnrollPro school year. The sync contract must remain authoritative.

## 4. Scope And Non-Goals

### In scope

- Server-side validation and authorization.
- Safe create, edit, activate, and deactivate workflows.
- Read-only details and school-year-scoped record summaries.
- Removal of the normal UI rollover action.
- Transactional and idempotent rollover hardening.
- Automated tests and operational verification.

### Out of scope for v1

- Reassigning records between school years.
- Editing archived years.
- Exporting arbitrary snapshot data unless the required data contract and authorization are defined.
- Adding notes or `createdBy` fields without a concrete reporting or audit requirement.
- A public or frontend-accessible test rollover endpoint.
- Changing EnrollPro synchronization behavior beyond making its transitions safe.

## 5. Execution Phases

### Phase 0: Data and contract inventory

Files to inspect before coding:

- `server/prisma/schema.prisma`
- `server/src/services/rollover.service.ts`
- `server/src/services/enrollpro-sync.service.ts`
- `server/src/routes/school-year.routes.ts`
- `server/src/routes/sync.routes.ts`
- `src/services/api.ts`
- `src/hooks/useSchoolYear.ts`
- `src/pages/admin/components/AdminSchoolYearTab.tsx`

Tasks:

- Record the current database counts, null `schoolYearId` counts, active-year count, duplicate labels, and overlapping date ranges.
- Identify every model that is expected to be school-year scoped, including reports, points, offenses, sales, inventory transactions, audit logs, and snapshots.
- Document how dates arrive from EnrollPro and normalize them to one timezone/date-only convention.
- Confirm whether current production consumers depend on `POST /:id/archive`; preserve the route contract during migration, but remove it from the UI.
- Decide the admin authentication middleware location. Reuse one shared middleware rather than copying JWT parsing into another route file.

Exit criteria:

- A written data inventory exists.
- Ambiguous or null-school-year records have an explicit handling decision.
- Lifecycle, date, authorization, and error-response contracts are approved before implementation.

### Phase 1: Backend invariants and authorization

Primary file: `server/src/routes/school-year.routes.ts`

Supporting files: shared auth middleware, validation helper/service, and a Prisma migration only where required.

Tasks:

- Protect list/detail endpoints from unauthorized access if they expose operational counts or student snapshot data.
- Require an authenticated `ADMIN` for all school-year mutations and rollover-triggering operations.
- Validate request bodies strictly: trim label, reject unknown or malformed values, parse ISO dates, and reject invalid `enrollproId` values.
- Require `label` to match `^\d{4}-\d{4}$` and require the second year to equal the first year plus one.
- Require `startDate < endDate`; define whether boundaries are inclusive and use that consistently in overlap checks.
- Enforce unique labels and non-overlapping date ranges server-side, excluding the record being edited.
- Make `POST /api/school-years` create inactive years by default. Do not silently replace the active year.
- Prefer `PATCH /api/school-years/:id` for partial edits, or document a deliberate `PUT` contract before adding it. Do not introduce both.
- Add `POST /api/school-years/:id/activate` and `POST /api/school-years/:id/deactivate` only if both transitions are needed by the UI. Implement each as an atomic transaction with the lifecycle rules above.
- Return consistent errors: `400` for invalid input or invalid state transition, `401` for missing/invalid auth, `403` for non-admin access, `404` for unknown IDs, and `409` for uniqueness, overlap, or concurrent-state conflicts.
- Add structured audit entries for manual create, update, activate, and deactivate actions with actor ID/name, action, target year, and before/after values.

Database decision:

- Add a unique label constraint if existing data is clean.
- Add a partial unique index for one active non-archived row if PostgreSQL migration support is used.
- If constraints cannot be added immediately, retain transaction-level checks and document the residual race risk; do not claim the invariant is guaranteed.

### Phase 2: Rollover hardening

Primary file: `server/src/services/rollover.service.ts`

Tasks:

- Keep automatic EnrollPro rollover as the primary production trigger.
- Make rollover idempotent by checking the target EnrollPro ID/label before doing work. A retry must not duplicate snapshots, inventory transactions, or resets.
- Execute all state changes in one Prisma transaction where feasible: snapshots, record tagging, archive, new-year creation, carry-forward entries, market reset, point reset, and audit log.
- Add a concurrency guard so cron, startup sync, and any administrative operation cannot run rollover simultaneously.
- Validate the target year before mutation: valid label, valid dates, unique EnrollPro ID, no overlap, and no conflicting active year.
- Replace broad null-record reassignment with an explicit policy from Phase 0. If legacy records are assigned, record counts and the reason in the audit log.
- Preserve existing snapshot semantics and verify whether zero-valued categories/students must be represented.
- Return a stable result shape that includes previous ID/label, new ID/label, counts, and a safe error code/message. Do not expose raw database errors to the UI.
- Ensure failures roll back all transactional changes and are observable through structured logs.

Testing note:

- Test rollover by invoking the service in an isolated test database or test harness. Do not add a production route guarded only by `X-Test-Mode`.
- If a route is temporarily required for local development, gate it by environment, require admin auth, use a typed confirmation phrase, rate-limit it, and ensure it cannot exist in production builds/configuration.

### Phase 3: Frontend management workflow

Files:

- `src/pages/admin/components/AdminSchoolYearTab.tsx`
- `src/pages/admin/components/CreateSchoolYearModal.tsx`
- `src/pages/admin/components/EditSchoolYearModal.tsx`
- `src/hooks/useSchoolYear.ts`
- `src/services/api.ts`

Tasks:

- Remove the `Trigger Rollover` button, handler, loading state, and destructive confirmation from the production admin tab.
- Replace the rollover banner with a concise explanation that EnrollPro synchronization controls automatic rollover and that archived years are read-only.
- Keep the active-year hero read-only with a details action.
- Add a clear summary row: total years, current active year, active-year reports, and active-year sales. Use data already returned by the API or add one defined aggregate endpoint; do not create client-side request waterfalls.
- Add a responsive history table/list with label, date range, lifecycle status, report count, sales count, and permitted actions.
- Add a create modal with required label/start/end fields and optional EnrollPro ID. New records must visibly show "Inactive" after creation.
- Add an edit modal for inactive years only. Archived years must not show an edit action. Keep `enrollproId` read-only once linked.
- Add activate/deactivate actions only when the lifecycle rules allow them. Show the replacement-year requirement before a deactivation request.
- Use inline field errors, disabled submit states, accessible labels, keyboard-closeable dialogs, focus management, and API error messages that preserve the server’s status meaning.
- Keep each component below the repository’s 1,000-line source-file limit; split detail and form sections if needed.
- Use the existing evergreen/teal design tokens and Lucide icons. Do not use emoji status indicators.

Details view:

- Show dates, lifecycle status, EnrollPro linkage/sync metadata, and aggregate counts.
- Show snapshot summaries only for authorized users and only from the detail response.
- Do not add export until format, pagination, authorization, and large-result behavior are specified.

### Phase 4: Verification and rollout

- Run frontend build and lint: `npm run build` and `npm run lint`.
- Run backend build: `npm --prefix server run build`.
- Run Prisma migration validation and tests against an isolated PostgreSQL database.
- Manually verify desktop and mobile admin layouts, dialog keyboard behavior, refresh behavior, and API failure states.
- Deploy backend changes before enabling new UI actions, while keeping the UI rollover removal independently safe.
- Monitor rollover logs, active-year count, failed syncs, and audit entries after release.

## 6. Proposed API Contract

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/school-years` | List years and permitted aggregate counts | Authenticated admin |
| `GET` | `/api/school-years/active` | Get current active year | Authenticated application user, if required by consumers |
| `GET` | `/api/school-years/:id` | Get details and snapshots | Authenticated admin |
| `POST` | `/api/school-years` | Create inactive year | Admin |
| `PATCH` | `/api/school-years/:id` | Edit non-archived year fields | Admin |
| `POST` | `/api/school-years/:id/activate` | Atomically make one year active | Admin |
| `POST` | `/api/school-years/:id/deactivate` | Deactivate with a valid replacement | Admin |
| `POST` | `/api/school-years/:id/archive` | Existing rollover compatibility route; not exposed in UI | Admin plus explicit confirmation, or service-only after migration |

Do not add `/test/rollover` to the production API. Existing consumers of `/archive` must be identified before changing or removing it.

Example update body:

```json
{
  "label": "2027-2028",
  "startDate": "2027-06-01T00:00:00.000Z",
  "endDate": "2028-05-31T23:59:59.999Z"
}
```

Example conflict response:

```json
{
  "error": {
    "code": "SCHOOL_YEAR_DATE_OVERLAP",
    "message": "The selected date range overlaps SY 2026-2027."
  }
}
```

## 7. Test Matrix And Acceptance Criteria

### Backend tests

- Unauthenticated requests to protected endpoints are rejected.
- Non-admin authenticated requests cannot mutate school years.
- Valid creation produces an inactive year.
- Invalid label, reversed dates, invalid year pair, duplicate label, duplicate EnrollPro ID, and overlapping dates are rejected.
- Editing excludes the current record from its own overlap check.
- Archived years cannot be edited, activated, or deactivated.
- Activation leaves exactly one active non-archived year.
- Deactivation without a valid replacement is rejected without changing data.
- Concurrent activation attempts resolve to one valid active year.
- Rollover creates one target year and is safe to retry.
- Rollover failure leaves no partial state changes.
- Legacy null-school-year handling matches the approved Phase 0 policy.
- Manual operations and rollover produce complete audit records.

### Frontend tests and QA

- Rollover controls are absent from the production school-year UI.
- Create, edit, activate, deactivate, refresh, loading, empty, validation, and server-error paths work.
- Archived rows are visibly read-only.
- Forms do not submit while invalid or while a request is pending.
- Dialogs work with keyboard and screen-reader labels.
- Mobile layout does not require horizontal scrolling for primary actions.
- Existing EnrollPro sync behavior and existing school-year API consumers remain functional.

Release acceptance:

- No data migration is run until the Phase 0 inventory is reviewed.
- Build, lint, backend build, migration checks, automated tests, and manual UI checks pass.
- Post-release monitoring confirms one active year and no unexpected rollover retries or duplicate snapshots.

## 8. File Change Summary

| File or area | Planned change |
|---|---|
| `server/src/routes/school-year.routes.ts` | Auth, validation, lifecycle endpoints, stable errors, audit context |
| Shared server auth/validation area | Reusable admin guard and school-year validation; avoid route-local JWT duplication |
| `server/src/services/rollover.service.ts` | Transactionality, idempotency, concurrency guard, explicit legacy-record policy |
| `server/prisma/schema.prisma` and migration | Only constraints proven safe by the data inventory |
| `src/services/api.ts` | Typed create/update/activate/deactivate methods |
| `src/hooks/useSchoolYear.ts` | Create/update/lifecycle actions, shared refresh/error handling |
| `src/pages/admin/components/AdminSchoolYearTab.tsx` | Remove rollover UI; add safe management layout and lifecycle actions |
| `src/pages/admin/components/CreateSchoolYearModal.tsx` | New accessible create form |
| `src/pages/admin/components/EditSchoolYearModal.tsx` | New accessible edit form |

## 9. Decisions Required Before Implementation

- What is the approved timezone and inclusive/exclusive interpretation for school-year dates?
- Should authenticated non-admin users be allowed to call `/active`, or should it remain admin-only?
- Which legacy records with `schoolYearId = null` belong to which year, and which must remain isolated?
- Must a manually created EnrollPro-linked year remain inactive until sync confirmation, or may an admin activate it?
- Is a PostgreSQL partial unique index acceptable for enforcing one active year?
- Which audit-log actor fields are available from the existing authentication flow?
