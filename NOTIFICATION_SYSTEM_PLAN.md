# Notification System Fix Plan

> **Status:** Proposed (2026-09-28) — awaiting approval.
> **Author context:** React 19 + Vite + Tailwind 4 frontend, Express + Prisma + PostgreSQL backend.
> **Related docs:** `WALK_IN_BOTTLE_TURNOVER_PLAN.md`, `SCHOOLYEAR-SYNC-AND-LEDGER-UNIFICATION-PLAN.md`.

---

## 0. TL;DR

**Q — Do notifications work today?**
No, except in one accidental case (same browser). Notifications are a client-side localStorage simulation: they are created **in the browser that performs the action** and never persisted server-side. The student is notified only if they sign in later **on that same browser profile**.

Concrete failures (all verified by code audit, 2026-09-28):

| Event | Notification created? | Where it lives | Student sees it cross-device? |
| --- | --- | --- | --- |
| Report verified | Yes — in the verifying admin's browser | `localStorage["sort_notifications_v2"]` | ❌ |
| Report dismissed | Yes — in the dismissing admin's browser | same | ❌ |
| Report dispatched / completed | Yes — in the acting staff browser | same | ❌ |
| Report submitted | Yes — admin + reporter drafts in the submitter's browser | same | ❌ |
| **Reward released** (the +25 pts case) | **No — nowhere** | — | ❌ |
| Walk-in milestone unlocked | No — nowhere | — | ❌ |
| Account warning / suspension | No — nowhere | — | ❌ |

**Fix:** add a server-persisted `Notification` model, emit rows at the server-side event points (reward release/unlock, report verify/dispatch/dismiss/submit, warnings), expose REST endpoints, and replace the localStorage feed with a server-backed hook. Every recipient then sees their notifications on any device.

---

## 1. Current-State Audit

### 1.1 There is no server-side notification system

- `server/prisma/schema.prisma` has **no `Notification` model**.
- No notification routes or services exist (`grep` over `server/src` returns zero matches).
- The only trace is a defensive `DELETE FROM notifications` "if exists" in `server/prisma/wipe-accounts.ts:15-18`.
- No SSE channel or polling endpoint for notifications (branding SSE at `server/src/routes/settings.routes.ts:34` is unrelated).

### 1.2 Notifications are a localStorage feed on the acting browser

| Piece | Location | Behaviour |
| --- | --- | --- |
| Store | `src/hooks/useNotifications.ts:26-48` | `useState` seeded from `localStorage`, persisted on every change |
| Storage key | `src/utils/notifications.ts:8` | `sort_notifications_v2` |
| Recipient filter | `src/utils/notifications.ts:17-33` | Matches `recipientId` or `recipientRole` against the signed-in user |
| Bell UI | `src/components/layout/DashboardLayout.tsx:38-121`, `src/components/common/NotificationBell.tsx` | Pure presentation over the local feed |
| Dismissals | `src/utils/notificationDismissals.ts` | localStorage set of hidden ids |

Draft builders exist only for reports: `buildVerifiedNotifications()` and `buildDispatchNotifications()` (`src/utils/notifications.ts:47-76`).

### 1.3 Where drafts are created (all client-side)

| Trigger | Call site | Recipient |
| --- | --- | --- |
| Report submitted | `src/hooks/useMockData.tsx:588` (ADMIN role), `:596` (reporter) | admin + reporter |
| Report completed / dismissed | `src/hooks/useMockData.tsx:681`, `:688` | reporter |
| Verify single / batch | `src/hooks/useMockData.tsx:1011`, `:1107` | reporter(s) |
| Dispatch | `src/hooks/useMockData.tsx:1070` | reporter(s) |
| Reward release | **absent** — `server/src/services/reward.service.ts:165-233` writes only claim state, `PointHistory`, stock, `AuditLog` | — |
| Walk-in unlock | **absent** — `server/src/services/walk-in.service.ts:230-269` | — |
| Warning / suspension | **absent** — `server/src/routes/user.routes.ts:98` | — |

Report status persistence (`server/src/routes/report.routes.ts:189-340`) and verification (`:342`, `server/src/services/report-points.service.ts:39-224`) write points and audit rows but never notifications.

### 1.4 Root cause

The notification feature was built during the mock-data phase, when "backend" meant the browser's localStorage. Business actions later moved server-side, but notification generation stayed in the acting user's browser. There is no mechanism that can deliver an alert to a different device.

---

## 2. Goals / Non-Goals

**Goals**
1. Server-persisted notifications with exact per-user targeting; delivered on any device.
2. Emit at the authoritative server event points (points/release/status actually committed).
3. Bell shows unread count; items can be marked read / read-all.
4. Notification failure can never break the underlying business action.
5. Cover: reward released, reward unlocked, report verified, dispatched, completed, dismissed, submitted, account warning.

**Non-goals (this plan)**
- Push/email/SMS delivery.
- Real-time <1s delivery (30s polling v1; SSE is a later option).
- School-year reconciliation (separate plan).
- Chat/messaging features.

---

## 3. Design

### 3.1 Data model (proposed)

```prisma
model Notification {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")          // exact recipient
  type          String                               // NotificationType (below)
  title         String
  message       String
  reportId      String?   @map("report_id")          // deep links (no FK cascade)
  claimId       String?   @map("claim_id")
  schoolYearId  String?   @map("school_year_id")
  readAt        DateTime? @map("read_at")
  createdAt     DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("notifications")
}
```

- **Per-user rows only.** Role-wide targets (e.g. the ADMIN review queue) are **fanned out** to the users holding that role at emit time (`createMany`). This keeps read semantics uniform (one `readAt` per row per recipient) and avoids a read-tracking join table. Trade-off: an admin created later does not see older queue alerts — acceptable.
- `reportId` / `claimId` are plain strings for deep-linking; deleting a report must not delete the alert history.
- `type` values extend the current union (`src/types/index.ts:348`) with: `REWARD_UNLOCKED`, `REWARD_RELEASED`, `ACCOUNT_WARNING`.

### 3.2 Service contract (`server/src/services/notification.service.ts`)

```ts
notifyUser(userId, draft): Promise<void>              // best-effort, never throws
notifyUsers(userIds[], draft): Promise<void>
notifyRole(role: Role, draft): Promise<void>          // resolves users → fan-out
listForUser(userId, opts): { notifications, unreadCount }
markRead(userId, notificationId): boolean
markAllRead(userId): number
```

- Emit **after** the business transaction commits (never inside `$transaction` for alerts); wrap in `.catch()` so an alert failure cannot fail a release/verify.
- Loss window (crash between commit and emit) is accepted; `AuditLog` remains the authoritative record.

### 3.3 Event catalog

| Type | Emit point (server) | Recipient | Message (draft) |
| --- | --- | --- | --- |
| `REWARD_RELEASED` | `reward.service.ts:165` after commit (points or physical) | claim student | `"Eco Green Tumbler released — +25 pts credited."` / `"…ready for pickup."` |
| `REWARD_UNLOCKED` | `walk-in.service.ts:230` per unlocked claim | student | `"You unlocked Recycler Badge (+25 pts) — request it from Rewards."` |
| `REPORT_VERIFIED` | `report-points.service.ts:39/96` after points award | reporter | `"Your report at {location} was verified. Points awarded."` |
| `REPORT_DISPATCHED` | `report.routes.ts:189` when status → DISPATCHED | reporter | `"MRF {name} is on the way to {location}."` |
| `REPORT_COMPLETED` | `report.routes.ts:189` when → COLLECTED/RESOLVED | reporter | `"Cleanup completed at {location}."` |
| `REPORT_DISMISSED` | `report.routes.ts:189` when → DISMISSED | reporter | `"Your report at {location} was dismissed. {penalty}"` |
| `REPORT_SUBMITTED` | `report.routes.ts:111` | reporter + ADMIN role | `"Report received — pending review."` / admin queue copy |
| `ACCOUNT_WARNING` | `user.routes.ts:98` | student | `"You received a warning ({n})."` |

Each emitted notification is also mirrored by the existing `AuditLog` write — no behavior change there.

### 3.4 Delivery mechanics

- **v1: polling.** A module-level hook cache with one 30s poller (same pattern as `src/hooks/useSchoolYear.ts:111-156`) fetches `GET /api/notifications`, avoiding duplicate requests across consumers.
- **v2 (optional):** per-user SSE (`/api/notifications/stream`) reusing the branding-stream pattern. Not required for acceptance.

### 3.5 Failure & security semantics

- Alert writes are best-effort; business endpoints return success based on their own transaction.
- `GET /api/notifications` is scoped to `req.userId` — a user can only ever read/mark their own rows.
- Messages may contain learner names/locations (personal data under RA 10173): rows are recipient-scoped, never exposed through public endpoints, and pruned with the user (`onDelete: Cascade`).
- No role leakage: fan-out resolves the role to actual user ids at emit time; no role-name matching at read time.

---

## 4. API Contract

| Method | Endpoint | Body / Query | Response | Auth |
| --- | --- | --- | --- | --- |
| `GET` | `/api/notifications` | `limit?` (≤100, default 50), `unreadOnly?` | `{ notifications: [...], unreadCount }` | any authenticated |
| `POST` | `/api/notifications/:id/read` | — | `{ ok: true }` (404 if not own) | any authenticated |
| `POST` | `/api/notifications/read-all` | — | `{ updated: n }` | any authenticated |
| `DELETE` | `/api/notifications/:id` | — | `{ ok: true }` | any authenticated |

Example row:
```json
{
  "id": "…", "type": "REWARD_RELEASED", "title": "Prize Released",
  "message": "Eco Green Tumbler released — +25 pts credited.",
  "reportId": null, "claimId": "…", "schoolYearId": "…",
  "readAt": null, "createdAt": "2026-09-28T12:00:00.000Z"
}
```

---

## 5. Frontend Changes

1. **New `src/hooks/useServerNotifications.ts`** — fetch on mount, poll every 30s, expose `{ notifications, unreadCount, markRead, markAllRead, refresh }`; map rows to the existing `BellNotification` shape and severity map (`DashboardLayout.tsx:38`).
2. **`DashboardLayout` / `StudentLayout`** — consume the new hook instead of `useMockData().notifications`; bell badge = `unreadCount`.
3. **Remove the simulation:**
   - delete `src/hooks/useNotifications.ts` localStorage store and its `addNotification(s)` call sites in `useMockData.tsx:588,596,681,689,1011,1070,1107`;
   - delete `src/utils/notificationDismissals.ts` (read state is server-side);
   - retire `src/utils/notifications.ts` builders; keep `isNotificationForUser` tests only if still used (otherwise delete with tests).
4. **File-size hygiene:** `useMockData.tsx` is 1,182 lines (already over the 1,000-line rule). This work must not grow it; removing notification blocks is expected to shrink it.

---

## 6. Phased Implementation

| Phase | Deliverable |
| --- | --- |
| 0 | Baseline: `npm run lint`, `npm run build`, server build, existing unit tests green |
| 1 | Prisma `Notification` model + migration + `notification.service.ts` (+ unit tests for targeting/fan-out) |
| 2 | Emit points in: reward release, walk-in unlock, report verify, status change (dispatch/complete/dismiss), report submit, warning |
| 3 | `notification.routes.ts` + mount in `server/src/index.ts`; API scoping tests |
| 4 | Frontend hook + bell wiring; remove localStorage generators |
| 5 | Cleanup dead files/tests; docs (data dictionary) |
| 6 | Verification (matrix below) |

---

## 7. Test & Acceptance Matrix

### Backend
- [ ] Reward release creates exactly one `REWARD_RELEASED` row for the claim's student, with points text when POINTS type.
- [ ] Walk-in unlock creates one row per newly unlocked milestone (not for already-owned claims).
- [ ] Verify/dispatch/dismiss create reporter rows only when the status actually changed; no duplicates on retry/idempotent paths.
- [ ] Report submit creates reporter + one row per current ADMIN.
- [ ] User A cannot list, read, or delete user B's notifications (403/404).
- [ ] `markAllRead` updates only own rows.
- [ ] Alert failure (e.g. simulated DB error in notification write) does not fail the business endpoint.

### Frontend (cross-device smoke)
- [ ] Admin releases a POINTS claim in browser A → student signs in on browser B → bell shows unread item *"…+25 pts credited"*; read-all clears the badge.
- [ ] Admin dismisses a report in browser A → reporter sees `REPORT_DISMISSED` on browser B.
- [ ] No duplicate `/api/notifications` requests with multiple consumers mounted (single poller).
- [ ] Legacy localStorage key is no longer written; stale entries ignored.

### Build
- [ ] `npm run lint` (0 errors), `npm run build`, `npm --prefix server run build`, unit tests pass.

---

## 8. Safeguards Against Regression

1. Additive DB change only (new table); no existing model modified.
2. Emitters are best-effort and never alter the return contract of business endpoints.
3. Existing `AuditLog` writes remain untouched.
4. No change to existing endpoint paths or error codes.
5. Frontend keeps the current `BellNotification` UI contract so the visual design is unchanged.
6. Polling follows the existing single-poller pattern to avoid request waterfalls.

---

## 9. File Change Summary

| File | Change |
| --- | --- |
| `server/prisma/schema.prisma` + migration | `Notification` model; `User.notifications` relation |
| `server/src/services/notification.service.ts` | **new** — emit + query + read semantics |
| `server/src/routes/notification.routes.ts` | **new** — REST endpoints |
| `server/src/index.ts` | mount `/api/notifications` |
| `server/src/services/reward.service.ts` | emit `REWARD_RELEASED` after commit |
| `server/src/services/walk-in.service.ts` | emit `REWARD_UNLOCKED` after unlock |
| `server/src/services/report-points.service.ts` | emit `REPORT_VERIFIED` after award |
| `server/src/routes/report.routes.ts` | emit submit / dispatched / completed / dismissed |
| `server/src/routes/user.routes.ts` | emit `ACCOUNT_WARNING` |
| `src/hooks/useServerNotifications.ts` | **new** — polling hook |
| `src/components/layout/DashboardLayout.tsx`, `StudentLayout.tsx` | consume server hook |
| `src/hooks/useMockData.tsx` | remove localStorage notification generation |
| `src/hooks/useNotifications.ts`, `src/utils/notificationDismissals.ts`, `src/utils/notifications.ts` | delete/retire (keep shared types) |
| `server/src/services/__tests__/notification.test.ts` | **new** — targeting/scoping tests |

---

## 10. Open Decisions

1. **Delivery:** 30s polling (recommended v1) vs per-user SSE (instant, more moving parts).
2. **Retention:** keep all rows vs prune older than N days (volume is low; default keep).
3. **Role fan-out vs role column:** fan-out recommended for uniform read state; revisit if admin rosters grow.
4. **Reward unlock copy:** one alert per milestone vs a single "You unlocked N rewards" summary (default per milestone).
5. **Legacy localStorage:** on first login after rollout, show old local entries once, or ignore them entirely (default ignore; server is the only source).

---

## 11. Verification Log (to fill during implementation)

- Baseline commands + results.
- Cross-device smoke evidence (admin action → student device notification).
- Migration name and applied status.
