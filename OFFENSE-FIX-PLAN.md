# WORKHORSE HANDOFF: 3rd Offense Bug Fix & State Synchronization Plan

## 1. Problem Statement
When an administrator marks a user's 3rd false report via "Mark Fake / Warning", the system fails to transition to the 3rd offense (Account Suspension). Instead, it remains stuck on the 2nd offense because:
1. `updateReportStatus` in `useMockData.tsx` triggers a background `apiService.getUsers()` fetch immediately after `addOffense`, which races with database writes and overwrites the local `warningsCount` state with stale data.
2. The cross-tab `storage` event listener in `useMockData.tsx` does not listen for `sort_offenses`, preventing concurrent student sessions from receiving updated sanctions in real time.
3. `AdminReportsTab.tsx` calculates the next offense level solely from `reporter?.warningsCount`, which can lag behind the actual offense count.
4. `OverviewTab.tsx` in the student portal renders the raw global `offenses` list without scoping to `currentUser.id`.

---

## 2. Target Files
- `c:\Users\NACION\OneDrive\Desktop\Sortv2\src\hooks\useMockData.tsx`
- `c:\Users\NACION\OneDrive\Desktop\Sortv2\src\pages\admin\components\AdminReportsTab.tsx`
- `c:\Users\NACION\OneDrive\Desktop\Sortv2\src\pages\student\components\OverviewTab.tsx`

---

## 3. Step-by-Step Implementation Instructions

### Step 1: Fix Offense Level Calculation in `AdminReportsTab.tsx`
**File:** `src/pages/admin/components/AdminReportsTab.tsx`

1. Inside both the **Auto-determined Offense Level preview JSX** (lines ~1100–1105) and `confirmRejectReport` (lines ~258–264):
   - Locate the reporter by `id` or fallback to matching by email/name.
   - Calculate the current warnings count accurately by taking the maximum between the user's `warningsCount` and the count of their recorded offenses in the `offenses` array:
     ```ts
     const reporter = users.find(u => u.id === report.reporterId || (report.reporterId && u.email?.toLowerCase() === report.reporterId.toLowerCase()));
     const userExistingOffenses = offenses.filter(o => o.userId === report.reporterId || o.userId === reporter?.id);
     const currentWarnings = Math.max(reporter?.warningsCount ?? 0, userExistingOffenses.length);
     const level = currentWarnings + 1;
     const autoSeverity: 'WARNING' | 'DEDUCT' | 'SUSPENSION' =
       level === 1 ? 'WARNING' : level === 2 ? 'DEDUCT' : 'SUSPENSION';
     ```
2. Pass `offenses` as a prop to `AdminReportsTabProps` if not already present, or retrieve it directly from `useMockData()`.
3. In `confirmRejectReport`, explicitly await `addOffense` before invoking `updateReportStatus`:
   ```ts
   if (report.reporterId) {
     await addOffense(
       report.reporterId,
       rejectJustification || `False or improper report: "${report.title}" at ${report.locationName}`,
       autoSeverity,
       report.id
     );
     if (autoSeverity === 'DEDUCT') {
       await deductPoints(report.reporterId, dismissPenalty, `Marked fake: ${report.title}`);
     }
   }
   if (updateReportStatus) {
     await updateReportStatus(report.id, 'DISMISSED' as any, undefined, 'Marked as fake/dismissed by admin', undefined, true);
   }
   ```

---

## 2. Prevent Stale State Overwrites in `useMockData.tsx`
**File:** `src/hooks/useMockData.tsx`

1. **Update `currentUser` in `addOffense`**:
   Ensure `currentUser` state immediately reflects the new offense, warnings count, and suspension if the authenticated user is the target:
   ```ts
   if (currentUser && currentUser.id === userId) {
     setCurrentUser(prev => prev ? {
       ...prev,
       warningsCount: data.warningsCount || prev.warningsCount + 1,
       accountStatus: effectiveSeverity === 'SUSPENSION' ? 'SUSPENDED' : prev.accountStatus,
       suspendedUntil: effectiveSeverity === 'SUSPENSION'
         ? (data.offense?.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
         : prev.suspendedUntil,
       points: data.pointsDeducted > 0 ? Math.max(0, prev.points - data.pointsDeducted) : prev.points,
     } : null);
   }
   ```
2. **Merge User State in `updateReportStatus` (Race Condition Shield)**:
   When `updateReportStatus` re-fetches `serverUsers`, merge `warningsCount` and `accountStatus` so a slightly delayed backend response cannot overwrite a newly incremented warning count:
   ```ts
   setUsers(prev => {
     return serverUsers.map((su: any) => {
       const local = prev.find(p => p.id === su.id);
       return {
         ...su,
         warningsCount: Math.max(su.warningsCount ?? 0, local?.warningsCount ?? 0),
         accountStatus: local?.accountStatus === 'SUSPENDED' ? 'SUSPENDED' : su.accountStatus,
         suspendedUntil: local?.suspendedUntil || su.suspendedUntil,
         certificatesEarned: su.certificatesEarned || su.certificates || [],
       };
     });
   });
   ```
3. **Add `sort_offenses` to Cross-Tab Storage Listener**:
   Inside `handleStorageChange` (lines ~316–332):
   ```ts
   if (e.key === 'sort_offenses') setOffenses(JSON.parse(e.newValue));
   ```

---

## 3. Scope Offenses to Current User in `OverviewTab.tsx`
**File:** `src/pages/student/components/OverviewTab.tsx`

1. Filter offenses to only those matching `currentUser.id`:
   ```ts
   const userOffenses = useMemo(() => {
     return offenses.filter(o => o.userId === currentUser.id);
   }, [offenses, currentUser.id]);
   ```
2. Replace all instances of `offenses` in the component's JSX with `userOffenses`:
   ```tsx
   {userOffenses.length > 0 && (
     <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5">
       <div className="flex items-center gap-2 mb-3">
         <AlertTriangle size={16} className="text-amber-500" />
         <h3 className="text-sm font-bold text-amber-800">Offenses ({userOffenses.length})</h3>
       </div>
       <div className="space-y-2">
         {userOffenses.slice(0, 3).map((offense) => {
           ...
         })}
       </div>
     </div>
   )}
   ```

---

## 4. Verification & Quality Gates
1. Run `npx vite build` to ensure zero compilation or TypeScript errors.
2. In the Admin view, inspect student `BALUYOT, VINCENT LORENZO` (who has 2 warnings).
3. In the Reports tab, reject a false report for this student:
   - Confirm modal renders: **3rd+ Offense — Account Suspension (1 day account ban)**.
   - Click Confirm.
4. Check the Student Dashboard:
   - Header shows: **Offenses (3)**.
   - List shows the 3rd offense as: **Account Suspension · Until [date/time]** with red badge.
   - Student's status is `SUSPENDED`.
