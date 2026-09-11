# WORKHORSE HANDOFF: False / Dismissed Report Status & Points Bug Fix

## 1. Problem Statement
When an administrator rejects or marks a report as fake (`DISMISSED`), the UI continues to display conflicting "Pending" badges and notices:
1. **Admin Report Detail Modal (`AdminReportsTab.tsx`)**:
   - Header badge shows `⏳ Pending Verification` because it checks `eyeModalReport.isVerified ? ... : ...` without checking if the report is `DISMISSED`.
   - The "Points Earned" field shows `Pending verification` because `pointsAwardedAt` is unset on dismissed reports.
2. **Student Activity Log (`ReportHistoryTab.tsx`)**:
   - The top-right card status pill shows `PENDING` because `getDisplayStatus` checks `title.toLowerCase().includes('dismissed')` rather than the canonical `report.status === 'DISMISSED'`.
   - The card footer displays `Pending Admin review` next to `Marked Invalid by Admin` because it falls back to the unverified branch when `pointsAwardedAt` is not present.

---

## 2. Target Files
- `src/pages/admin/components/AdminReportsTab.tsx`
- `src/pages/student/components/ReportHistoryTab.tsx`

---

## 3. Step-by-Step Implementation Instructions

### Step 1: Fix Status Badge & Points Earned in `AdminReportsTab.tsx`
**File:** `src/pages/admin/components/AdminReportsTab.tsx`

1. **Header Status Pill (lines ~747–753):**
   Prioritize `DISMISSED` status before checking `isVerified`:
   ```tsx
   <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
     eyeModalReport.status === 'DISMISSED'
       ? 'bg-rose-100 text-rose-800 border border-rose-200'
       : eyeModalReport.isVerified
         ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
         : 'bg-amber-100 text-amber-900 border border-amber-200'
   }`}>
     {eyeModalReport.status === 'DISMISSED'
       ? '✕ Dismissed / Flagged Fake'
       : eyeModalReport.isVerified
         ? '✓ Verified'
         : '⏳ Pending Verification'}
   </span>
   ```

2. **Points Earned Field (lines ~808–820):**
   Explicitly handle `DISMISSED` so it displays 0 points awarded instead of "Pending verification":
   ```tsx
   <span className={`font-extrabold flex items-center gap-1.5 mt-1 text-sm ${
     eyeModalReport.status === 'DISMISSED'
       ? 'text-rose-600'
       : eyeModalReport.pointsAwardedAt
         ? (eyeModalReport.pointsAwarded > 0 ? 'text-[#00A77C]' : 'text-gray-500')
         : 'text-gray-400'
   }`}>
     <Award size={14} className={
       eyeModalReport.status === 'DISMISSED'
         ? 'text-rose-400'
         : eyeModalReport.pointsAwardedAt && eyeModalReport.pointsAwarded > 0
           ? 'text-[#C69B26]'
           : 'text-gray-300'
     } />
     {eyeModalReport.status === 'DISMISSED'
       ? '0 pts (Report Dismissed)'
       : eyeModalReport.pointsAwardedAt
         ? (eyeModalReport.pointsAwarded > 0 ? `+${eyeModalReport.pointsAwarded} pts` : 'No points awarded')
         : 'Pending verification'}
     {eyeModalReport.reporterRank != null && (
       <span className="text-[9px] font-bold text-[#C69B26] bg-[#C69B26]/10 px-1.5 py-0.5 rounded-full">
         Rank #{eyeModalReport.reporterRank}
       </span>
     )}
   </span>
   ```

---

### Step 2: Fix Status Pill & Points in `ReportHistoryTab.tsx`
**File:** `src/pages/student/components/ReportHistoryTab.tsx`

1. **`getDisplayStatus` Helper (lines ~37–43):**
   Check `status === 'DISMISSED'` directly so cards and status filter pills accurately classify dismissed reports:
   ```tsx
   const getDisplayStatus = (status: string, title: string, isVerified?: boolean) => {
     if (status === 'DISMISSED' || title.toLowerCase().includes('dismissed') || title.toLowerCase().includes('rejected')) return 'Dismissed';
     if (status === 'COLLECTED' || status === 'RESOLVED') return 'Resolved';
     if (status === 'DISPATCHED') return 'Dispatched';
     if (isVerified) return 'Verified';
     return 'Pending';
   };
   ```

2. **Card Points Status Bar (lines ~223–238):**
   Do not show "Pending Admin review" if `rep.status === 'DISMISSED'`:
   ```tsx
   <div>
     {rep.status === 'DISMISSED' ? (
       <span className="text-rose-600 font-extrabold text-[10px]">
         0 pts (Dismissed)
       </span>
     ) : rep.pointsAwardedAt ? (
       rep.pointsAwarded > 0 ? (
         <span className="text-[#00A77C] font-black text-xs">
           +{rep.pointsAwarded} PTS AWARDED
         </span>
       ) : (
         <span className="text-gray-500 font-bold text-[10px]">
           No points awarded
         </span>
       )
     ) : (
       <span className="text-amber-600 font-extrabold text-[10px]">
         Pending Admin review
       </span>
     )}
   </div>
   ```

---

## 4. Verification Checklist
- [ ] Run `npx tsc --noEmit` or `npm run build` to verify no compilation/lint errors.
- [ ] In the **Admin Console (`/admin`)**:
  - Open a dismissed report via the eye icon.
  - Verify header shows `✕ Dismissed / Flagged Fake` in rose/red instead of `⏳ Pending Verification`.
  - Verify "Points Earned" shows `0 pts (Report Dismissed)` instead of `Pending verification`.
- [ ] In the **Student Portal (`/student`)**:
  - Open the "Activity" tab.
  - Verify the report card top-right pill shows `DISMISSED` in rose/red instead of `PENDING`.
  - Verify the footer status bar shows `0 pts (Dismissed)` instead of `Pending Admin review`.
