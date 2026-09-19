# Residual Waste Monitoring — Plan

**Scope (confirmed):** monitor residual waste only. **No** environmental-impact math (no CO₂, no trees saved, no diversion-rate claims).

---

## 1. What "residual" means here

Per RA 9003 / DepEd Order No. 5, s. 2014, residual waste is what remains after biodegradable, recyclable and hazardous streams are separated — the fraction routed to disposal (sachets, plastic films, contaminated paper, sanitary waste).

In SORT that maps to exactly one existing stream: **`NON_BIODEGRADABLE`** (the black/blue bin — described in-app as *"Wrappers, plastic films & residual waste"*).

- **Residual = `NON_BIODEGRADABLE` only.**
- **`HAZARDOUS` stays a separate stream** (special waste) — it must never be folded into residual.
- `GENERAL` and `ORGANIC` are dead legacy values; they must be removed from every filter.

---

## 2. Current state (measured)

| Item | Finding |
|---|---|
| Residual definition on **Collections** | `GENERAL ∥ NON_BIODEGRADABLE ∥ ORGANIC` → effectively Non-Bio only |
| Residual definition on **Impact** | `GENERAL ∥ ORGANIC ∥ HAZARDOUS` → effectively Hazardous only |
| Agreement between the two screens | **None** — different sets, different totals |
| Weight captured | **2 of 14 reports**; MRF completion modal has **no weight field** |
| Non-biodegradable collected | 3 batches, **0 kg** recorded |
| Export / reporting for school head | none |

**Net:** residual is counted by batch only, the weight is always zero, and two screens disagree.

---

## 3. Plan

### Phase 1 — One definition, one source of truth
1. Create a single shared helper, e.g. `src/utils/wasteStreams.ts`:
   - `isResidual(category)` → `category === 'NON_BIODEGRADABLE'`
   - `residualRecords(reports)` / `sumWeight(records)`
2. Replace **both** existing residual filters (Collections + Impact) with this helper.
3. Delete all `GENERAL` / `ORGANIC` comparisons from the residual logic.

**Done when:** both screens compute residual from the same function and always show identical totals.

### Phase 2 — Capture residual weight (the keystone)
Without weight, residual monitoring is just a batch count.

4. Add a **weight (kg) input** to the MRF *Complete Task Assignment* modal
   - required when the report is residual (`NON_BIODEGRADABLE`), optional otherwise
   - numeric, `0 – 100000`, server-side validation already exists (`INVALID_WEIGHT`)
5. Persist it to `report.weightCollected` on completion.
6. Mark weightless legacy batches explicitly (e.g. *"unweighed"*) instead of silently counting them as `0 kg`, so no total is ever misleading.

**Done when:** completing a residual dispatch with 4.5 kg immediately raises the residual total by 4.5 kg.

### Phase 3 — The monitoring view
7. One **"Residual Waste Monitoring"** panel (single implementation, reused wherever needed):
   - Total residual **kg** and **batches**
   - **Average kg per batch**
   - **Unweighed batches** count (transparency, not hidden)
   - **Trend**: daily / weekly / monthly totals
   - **By station** breakdown (which campus locations generate the most residual)
   - **Last updated** timestamp
8. Remove the duplicate/conflicting residual cards so there is exactly one place defining the number.

### Phase 4 — Reporting
9. **CSV export** of residual records: date, location, reporter, weight, collector, status.
10. School-head summary line: residual collected per period (supports the DO 5 monitoring duty).

### Phase 5 — Remove the unbuilt environmental claim
11. Landing page currently advertises: *"Converts raw waste weight into ecological metrics — CO₂ reduction, trees saved, and landfill space diverted."* **No such calculation exists in the code.**
12. Remove that wording and replace it with what the system genuinely does, e.g.:
    > *"Tracks residual waste volume routed to disposal and keeps segregation records for reporting."*
13. Sweep the Impact tab for any leftover impact-style wording that implies CO₂/trees math.

**Done when:** nothing in the UI claims a metric the system does not compute.

### Phase 6 — Verification (gate)
14. DB-vs-UI check: sum of residual weight in the database equals the panel's total.
15. Both screens showing residual agree to the kilogram.
16. Playwright: MRF completes a residual dispatch **with weight** → the value appears in monitoring; a weightless batch is flagged, not counted as 0.
17. `npm run verify` → 23/23 still passing.

---

## 4. Decisions I need

1. **Weight entry:** per-report in the MRF completion modal (recommended), or a separate bulk "residual log" entry like the Recycle Market?
2. **Where should the monitoring panel live?** Collections tab (recommended — it already owns waste operations), or its own tab?
3. **Trend granularity:** daily, weekly, or both with a toggle? (recommended: weekly with a daily view for the current month)
4. **Legacy batches** already collected without weight (3 today): leave flagged as "unweighed", or backfill manually?

---

## 5. Effort estimate

| Phase | Effort |
|---|---|
| 1 — unify definition | ~20 min |
| 2 — weight capture | ~40 min |
| 3 — monitoring panel | ~60 min |
| 4 — CSV / report | ~25 min |
| 5 — remove claim | ~10 min |
| 6 — verification | ~25 min |
| **Total** | **~3 hours**, low risk, no schema change required |

No database migration is needed: `report.weightCollected` already exists and is already validated server-side.
