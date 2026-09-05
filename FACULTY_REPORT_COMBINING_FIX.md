# Faculty Report Combining Fix

## Objective

Ensure that a faculty report and a student report for the same physical waste
station use the same `locationName`, so the existing admin grouping and server
verification logic treats them as one location/category stream.

This fix is limited to preventing new teacher submissions from generating a
doubled location name. It must not change point rules, report ranking rules,
asset-room naming, custom debris pins, or existing database records.

## Observed Failure

Example:

- Student report: `Science Hall Cafeteria Side`
- Faculty report: `Science Hall Cafeteria Side - Science Hall Cafeteria Side`

The admin UI groups by the exact combination of `locationName` and `category`.
The points service also uses the exact location/category combination when it
loads a verification stream. These two values therefore create separate groups
and separate verification streams.

## Root Cause

The station selector currently handles a station without a room/building
separator like this:

```typescript
setRoomNumber(station.locationName);
setSelectedBuilding(station.locationName);
```

The dashboard then combines both state values:

```typescript
`${selectedBuilding} - ${roomNumber}`
```

That produces the same station name twice. There are two selection paths that
must stay consistent:

- `src/pages/teacher/components/TeacherLocationSelector.tsx`
  `handleSelectStation`
- `src/pages/teacher/components/TeacherSubmitReportTab.tsx`
  `handleLocationSelect`

The current plan incorrectly referenced `src/pages/teacher/TeacherLocationSelector.tsx`.
That file does not exist.

## Canonical Location Rules

Apply these rules without changing the existing location vocabulary:

1. A station label without the existing room/building separator is a complete
   location. Store it in `selectedBuilding` and set `roomNumber` to an empty
   string.
2. A station label with the existing separator continues to parse as
   `roomNumber` plus `selectedBuilding`, preserving the current asset-room
   behavior.
3. A normal report location is composed as follows: use `Scattered Debris` for
   a custom debris pin; use only the trimmed building/station name for an empty
   room or equal room/building values; and use the existing `building - room`
   format when the trimmed room and building values are genuinely different.
4. Do not globally replace separators, rename stations, normalize case, or
   merge records in the database. Exact strings are part of the current stream
   identity.
5. Keep category in the stream identity. Reports at the same location but in
   different categories must remain separate groups.

## Implementation Steps

### 1. Correct station selection state

**File:** `src/pages/teacher/components/TeacherLocationSelector.tsx`

Update `handleSelectStation`:

- Keep `setSelectedLocation(station.locationName)` unchanged.
- Keep coordinates and custom-pin reset behavior unchanged.
- Keep the existing separator parsing for room/building labels.
- For a label without that separator, call `setRoomNumber('')` and
  `setSelectedBuilding(station.locationName)`.
- Do not set both state fields to the same complete station label.

### 2. Keep the alternate selection path consistent

**File:** `src/pages/teacher/components/TeacherSubmitReportTab.tsx`

Update `handleLocationSelect` with the same parsing rule:

- For a compound room/building label, preserve the current room/building
  assignments.
- For a simple station label, clear `roomNumber` and set
  `selectedBuilding` to the station label.
- Do not leave a previous room value in state when switching from a compound
  location to a simple station.

Both handlers must produce the same state for the same selected label. Do not
implement one handler differently as a workaround.

### 3. Make report composition defensive

**File:** `src/pages/teacher/TeacherDashboard.tsx`

Update the `buildingAndRoom` calculation at the report creation boundary:

- Trim the building and room values once before comparing or composing them.
- Retain the `Scattered Debris` branch exactly.
- Add the equality guard so a legacy/stale state pair cannot create a doubled
  location.
- Preserve the existing `building - room` output when the two values are
  genuinely different.
- Preserve the existing fallback behavior for normal selected locations.

This guard is defense in depth. It does not replace fixing both selector paths.

### 4. Do not modify unrelated grouping or verification code

Leave these behaviors unchanged:

- `AdminReportsTab.tsx` grouping by location plus category.
- `report-points.service.ts` stream loading, faculty detection, and ranking.
- `useMockData.tsx` verification, dispatch, notification, and refresh flows.
- Student report submission and student location values.
- Asset report labels and custom debris-pin submission.
- Historical reports already stored with doubled location names.

If historical data cleanup is needed, document it as a separate, explicitly
approved data migration. Do not silently rewrite production reports as part of
this UI fix.

## Acceptance Criteria

### Ranking example that must remain valid

For three reports in the same location/category stream, ordered by submission
time:

1. Student report: eligible student rank 1, receives 15 points.
2. Faculty report: receives 0 points, has no student rank, and does not consume
   a student rank.
3. Student report: eligible student rank 2, receives 10 points.

The faculty report is skipped for ranking, not treated as a zero-point student
rank. This location fix only ensures all three reports enter the same stream;
the points service remains responsible for applying the ranking atomically and
consistently whether reports are verified together or in separate requests.

### Location-state checks

- Selecting `Science Hall Cafeteria Side` sets the selected building to that
  exact value and clears the room.
- Selecting a room/building label still assigns room and building as before.
- Switching from a room/building label to a simple station clears the old room.
- A custom debris pin still submits as `Scattered Debris`.
- A genuinely compound location still submits in the existing
  `building - room` format.

### Combining checks

Use the same active school year, location, and category for each pair:

1. Submit a student report at `Science Hall Cafeteria Side`.
2. Submit a faculty report at that same station and category.
3. Confirm both reports have exactly the same `locationName`.
4. Confirm the admin view renders one location/category group containing both
   reports.
5. Run group verification and confirm the existing server behavior remains:
   faculty receives no points and does not consume a student rank.
6. Confirm student points and report status behavior remain unchanged.

Repeat with the faculty report submitted first. Also verify that:

- Same location with a different category remains a separate group.
- Different locations with the same category remain separate groups.
- Existing doubled records are not modified by loading or submitting a new
  report.

## Verification Commands

Run from the repository root:

```text
npm run lint
npm run build
```

Because this repository has no test script in `package.json`, the acceptance
checks above are the required manual regression checks. If an existing local
test harness is introduced before implementation, add focused tests for both
selection handlers and the location composition rule rather than adding a new
test framework solely for this fix.

## Change Boundary

Expected source changes are limited to:

- `src/pages/teacher/components/TeacherLocationSelector.tsx`
- `src/pages/teacher/components/TeacherSubmitReportTab.tsx`
- `src/pages/teacher/TeacherDashboard.tsx`

Do not expand the implementation into backend grouping, point-awarding
redesign, database migrations, or broad location normalization unless a
separate requirement is approved.
