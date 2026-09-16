# Asset Scrap Recovery & Disposition Plan

> **Status:** Implemented (2026-09-15). See §13.
> **Goal:** (1) Replace the MRF asset "outcome" dropdown with DepEd/COA-aligned dispositions, and (2) add a **Scrap Recovery Stock** ledger (weigh → store → accumulate → sell by threshold) modeled on the existing Recycle Market — **without regressing** the recycle market, the asset ledger, or the points/collection flow.
> **Related:** `POINTS_AWARD_ON_COLLECTION_PLAN.md`, `server/src/routes/market.routes.ts`, `src/hooks/useRecycleMarket.ts`.

---

## 0. TL;DR

Today an unserviceable asset (e.g., a metal chair) has only a 3-option outcome that isn't persisted server-side, and the Asset Ledger is a separate manual log. There is **no weight/stock/sale path for asset scrap** like the recyclables have.

Proposed:
1. **New disposition options** (reuse + disposal tracks) on the MRF Complete Task modal, mapped to the existing ledger action (`RECOVERED`/`REPAIRED`/`DISPOSED`).
2. **Scrap Recovery Stock** — a new, independent ledger for unserviceable assets: record **weight (kg) per material**, store at the MRF, accumulate, and **sell a batch when the threshold is reached** (with Disposal Committee/Division approval + reference). Mirrors `RecycleMarketStock`/`RecycleSaleTransaction` exactly.
3. **Additive only** — new tables, routes, hook, and UI; existing recycle market, asset ledger, and points flow are untouched.

---

## 1. Current State (evidence)

| Concern | Location | Behaviour |
| --- | --- | --- |
| Asset outcome dropdown | `src/pages/mrf/MRFDashboard.tsx` (state `assetOutcome`, select ~:903-911, submit ~:249-255) | 3 options: `Repaired On-Site`, `Transported to MRF Workshop`, `Needs Replacement`. Passed to `updateReportStatus(..., assetOutcome)` |
| Status update (server) | `server/src/routes/report.routes.ts` PATCH `/:id/status` | Accepts only `status`, `assignedMrfId`, `weightCollected`. **The asset outcome is not persisted.** |
| Client persistence | `src/hooks/useMockData.tsx` `updateReportStatus` | Stores `collectedOutcome` locally only |
| Asset ledger | `server/src/routes/asset.routes.ts`, `MrfAssetRecord` (`schema.prisma:606`), `MRFAssetLedgerPage.tsx` | Manual log: `RECOVERED` / `REPAIRED` / `DISPOSED`; quantity in pcs; **no kg, no threshold, no sales** |
| Recycle Market (pattern to copy) | `market.routes.ts`, `useRecycleMarket.ts`, `RecycleMarketStock` (:457), `RecycleSaleTransaction` (:473), `MRFMarketTab.tsx` | Per-category `accumulatedKg`, `thresholdLimitKg`, `isApprovedForSale`, `sell-batch` (caps at threshold, logs revenue), snapshots at rollover |
| Rollover snapshots | `rollover.service.ts`, `MarketStockSnapshot` (:578) | Opening/closing kg per category per school year |

---

## 2. Design A — Asset Disposition Options

Replace the 3 options with two tracks. Each option maps to the existing ledger `action` so no ledger schema change is needed.

### Reuse / recovery track
| Option | Meaning | Ledger action | Extra |
| --- | --- | --- | --- |
| **Recovered – awaiting assessment** | Pulled from the waste stream, not yet judged | `RECOVERED` | — |
| **Repaired On-Site – returned to service** | Fixed where it is | `REPAIRED` | — |
| **Repaired at MRF / Repair Workshop** | Fixed at the MRF, then returned | `REPAIRED` | — |
| **Repurposed / Upcycled** | Converted to another use | `REPAIRED` | — |
| **Reassigned / Redeployed** | Serviceable but excess; moved to another room/office | `REPAIRED` | cross-school = transfer (needs Division approval) |
| **Stored for Future Repair** | Repairable, awaiting parts/budget | `RECOVERED` | stays pending |
| **Cannibalized for Spare Parts** | Usable parts removed for other units | `DISPOSED` | remainder → scrap (feeds Design B) |

### Disposal track (requires approval + documentation)
| Option | Meaning | Ledger action | Required reference |
| --- | --- | --- | --- |
| **Declared Unserviceable → Weighed & Stored as Scrap** | Beyond repair/obsolete | `DISPOSED` | auto-creates a **Scrap Stock** entry (Design B) |
| **Sold as Junk/Scrap (batch)** | Scrap threshold reached | `DISPOSED` | Disposal Committee approval + IIRUP/WMR/PTR |
| **Condemned / Destroyed** | Valueless/hazardous | `DISPOSED` | supervised destruction + reference |
| **e-Waste → Accredited Handler** | Electronics/batteries | `DISPOSED` | DENR-accredited handler; **not** ordinary junk |
| **Donated / Returned to Supplier** | Approved transfer | `DISPOSED` | approval reference |

**Back-compat:** keep a mapping table from the old strings (`Repaired On-Site`→repaired, `Transported to MRF Workshop`→repaired, `Needs Replacement`→unserviceable) so any historical/local value still resolves.

---

## 3. Design B — Scrap Recovery Stock

The unserviceable flow the user described: **weigh → store at MRF → accumulate → sell when threshold reached.** This is the recycle market pattern applied to asset scrap by **material**.

### 3.1 Materials
Seeded default list (string codes, like market categories — extensible by admin):
`ferrous_metal` (steel/iron furniture frames), `non_ferrous_metal` (aluminum, copper wiring), `e_waste`, `plastic`, `wood`, `glass`, `mixed`.

Each has: `materialCode`, `materialName`, `thresholdLimitKg`, `marketPricePerKg`, `accumulatedKg`, `isApprovedForSale`, `approvedAt`.
Compliance fields: `approvalReference` (WMR/IIRUP/PTR/Disposal Committee minutes) and `hazmat` flag (e-waste must not be ordinary-sold).

### 3.2 Flow
1. MRF completes an asset report with **"Declared Unserviceable"** → prompt for **weight (kg)** + **material**.
2. Creates an `MrfAssetRecord` (action `DISPOSED`) **and** adds kg to that material's `asset_scrap_stocks.accumulatedKg`.
3. Item is stored in the MRF scrap area (tracked by stock, not per-item).
4. When `accumulatedKg >= thresholdLimitKg` → shows **Ready to Sell**.
5. Admin/Disposal Committee **approves** (`isApprovedForSale`) with a reference.
6. MRF **sells a batch** → caps at threshold (remainder stays), logs a sale transaction + revenue; resets approval.
7. Sale proceeds go to the MRF fund (same accounting style as the recyclables market).

### 3.3 Data model (additive)
```prisma
model AssetScrapStock {
  id               String    @id @default(uuid())
  materialCode     String    @unique @map("material_code")
  materialName     String    @map("material_name")
  thresholdLimitKg Float     @map("threshold_limit_kg")
  marketPricePerKg Float     @map("market_price_per_kg")
  accumulatedKg    Float     @default(0) @map("accumulated_kg")
  isApprovedForSale Boolean  @default(false) @map("is_approved_for_sale")
  approvalReference String?  @map("approval_reference")
  approvedAt       DateTime? @map("approved_at")
  hazmat           Boolean   @default(false)
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")
  @@map("asset_scrap_stocks")
}

model AssetScrapSaleTransaction {
  id            String   @id @default(uuid())
  materialCode  String   @map("material_code")
  materialName  String   @map("material_name")
  weightKg      Float    @map("weight_kg")
  marketPriceKg Float    @map("market_price_kg")
  totalRevenue  Float    @map("total_revenue")
  buyerName     String   @map("buyer_name")
  approvalReference String? @map("approval_reference")
  schoolYearId  String?  @map("school_year_id")
  schoolYear    SchoolYear? @relation(fields: [schoolYearId], references: [id], onDelete: SetNull)
  soldAt        DateTime @default(now()) @map("sold_at")
  @@index([schoolYearId])
  @@map("asset_scrap_sale_transactions")
}
```
Plus a `AssetScrapStockSnapshot` (opening/closing kg per material per year) if we want rollover parity (§6).

> Keeping these **separate from `recycle_market_stocks`** is deliberate: mixing asset scrap into the recyclables market would corrupt the recyclables KPIs, ledger, and sales reporting.

---

## 4. How the Flows Connect (optional but recommended)

- Completing an asset report as **Declared Unserviceable** can **auto-create** the `MrfAssetRecord` + scrap kg in one action (removes the double-entry the MRF does today via "Record Asset").
- Keep the **manual "Record Asset"** and add a **manual "Weigh scrap"** entry for items brought to the MRF later (the user's "deliver to MRF, weigh when they have time" case).
- **e-Waste** variant: routes to a separate non-sale track (accredited handler), never to the junk-sale threshold.

---

## 5. API Contract (additive)

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/asset-scrap/stocks` | List scrap stock by material (auto-seeds defaults) | MRF/Admin |
| `PATCH` | `/api/asset-scrap/stocks/:code` | Add kg / set threshold / price | MRF/Admin |
| `POST` | `/api/asset-scrap/approve-sale` | Approve batch sale (+ reference) | Admin |
| `POST` | `/api/asset-scrap/sell-batch` | Sell (cap at threshold), log revenue | MRF/Admin |
| `GET` | `/api/asset-scrap/sales` | Sales ledger (by school year) | MRF/Admin |

No existing endpoint changes.

---

## 6. Rollover & School-Year Scoping

- New sale transactions and (optionally) snapshots carry `schoolYearId` like `RecycleSaleTransaction`.
- Add `assetScrapStocks` snapshots to `executeRollover` **only if** we want carry-forward parity; otherwise leave scrap stock as a standing MRF asset (decide — §11 Q4). Either way this is additive to the rollover transaction.

---

## 7. UI Changes

| Area | Change |
| --- | --- |
| `MRFDashboard` Complete Task modal | Replace 3 outcome options with §2 tracks; when "Unserviceable" is chosen, show **weight (kg) + material + approval reference** |
| New **Scrap Stock** view | Mirror `MRFMarketTab`: material cards with `x / threshold kg`, Ready-to-Sell badge, Approve (admin), Sell batch, sales ledger |
| `MRFAssetLedgerPage` | Unchanged table; optionally show a "to scrap stock (kg)" link and an `approvalReference` column |
| Admin | Optional approve-sale control (mirrors recycle-market approval) |

---

## 8. Regression Register (the "won't regress" part)

| ID | Risk | Safeguard |
| --- | --- | --- |
| R1 | Breaking the recyclables Recycle Market | **Separate tables/endpoints/hook**; do not touch `RecycleMarketStock`/`market.routes.ts`/`useRecycleMarket` |
| R2 | Breaking the asset ledger or its existing rows | Additive columns only if any; keep `RECOVERED/REPAIRED/DISPOSED` and existing records; new fields nullable |
| R3 | Old asset outcomes/values fail to resolve | Keep a mapping table for the legacy 3 strings |
| R4 | Points/collection flow regression | Assets are faculty (0 pts); do **not** touch `report-points.service.ts` or the collect path |
| R5 | Rollover data loss | If scrap stock is year-scoped, extend `executeRollover` + snapshot; otherwise document intentionally standing |
| R6 | Client breaks if server not migrated | New endpoints 404-guarded; hook falls back to defaults (like `useRecycleMarket`) |
| R7 | localStorage cache collisions | New, versioned keys (`sort_scrap_stocks`, `sort_scrap_sales`) |
| R8 | Ledger/report KPIs double-counting scrap as recyclables | Keep scrap out of recycle-market aggregates and the year ledger `market` section |
| R9 | e-Waste wrongly sold as junk | `hazmat` flag blocks sell-batch; e-waste has its own non-sale track |
| R10 | File-size rule (1,000 lines) | Extract `AssetScrapStockTab.tsx` + `useAssetScrap.ts` |

---

## 9. Test & Acceptance Matrix

- [ ] Complete an asset task as **Unserviceable** → asset record created and scrap kg added to the right material.
- [ ] Accumulating kg below threshold shows not-ready; crossing threshold shows **Ready to Sell**.
- [ ] Batch sale caps at threshold, leaves remainder, logs weight/revenue/buyer/**approval reference**, resets approval.
- [ ] e-Waste cannot be sold as ordinary scrap.
- [ ] Recycle Market stock/sales/ledger are byte-for-byte unchanged (regression test).
- [ ] Asset ledger existing actions and historical rows render unchanged; legacy outcome strings still resolve.
- [ ] Rollover: scrap data either snapshotted or explicitly untouched (per decision), with no partial-state errors.
- [ ] Points/collection behavior unchanged.
- [ ] Builds + lint pass; file-size rule respected.

---

## 10. Phased Rollout

1. **Phase 1** — Schema/migration (2–3 new tables) + backend routes + seed defaults.
2. **Phase 2** — `useAssetScrap` hook + `AssetScrapStockTab` UI (stock, approve, sell, ledger).
3. **Phase 3** — New asset outcome dropdown + wire "Unserviceable" to scrap stock; keep legacy mapping.
4. **Phase 4** — Rollover integration (if adopted) + verification.

---

## 11. Open Decisions

1. **Scrap materials:** fixed seed list vs admin-editable (recommend admin-editable, like market stocks)?
2. **Pricing:** per-material price/kg seeded (ferrous vs non-ferrous vs e-waste differ a lot) — confirm sourcing.
3. **Approval authority:** ✅ **Declared Unserviceable auto-adds to scrap** (chosen) — completing the asset task records the asset **and** adds its weight to the matching material's scrap stock; manual "Weigh scrap" stays available for later deliveries.
4. **Rollover:** ✅ **carry forward like market stock** — snapshot opening/closing kg per material per school year and carry the balance into the new year.
5. **Auto-create ledger record** on asset completion: yes (part of the chosen auto-add flow).
6. **e-Waste:** separate non-sale ledger track, or same stock with `hazmat=true` blocking sale?

### Implementation notes (decisions locked in)
- Auto-add requires the MRF asset-completion modal to capture **weight (kg) + material** when "Declared Unserviceable" is selected, and the completion call to (a) create the `MrfAssetRecord` and (b) `PATCH /asset-scrap/stocks/:code { addKg }` in the same action.
- Rollover adds an `AssetScrapStockSnapshot` model and steps in `executeRollover` mirroring `MarketStockSnapshot` (snapshot closing kg at archive, carry forward as opening next year).
- **DB step:** this introduces new tables — applying it requires a Prisma migrate/push and `prisma generate`, which needs the backend dev server briefly stopped (engine DLL lock) before restarting.

---

## 12. File Change Summary

| File | Change |
| --- | --- |
| `server/prisma/schema.prisma` + migration | Add `AssetScrapStock`, `AssetScrapSaleTransaction`, optional snapshot |
| `server/src/routes/asset-scrap.routes.ts` (new) | Stocks / approve / sell-batch / sales |
| `server/src/index.ts` | Register route |
| `server/src/services/rollover.service.ts` | (Optional) snapshot/carry scrap stock |
| `src/hooks/useAssetScrap.ts` (new) | Stock + sales state, actions, fallbacks |
| `src/pages/mrf/components/AssetScrapStockTab.tsx` (new) | Mirror of `MRFMarketTab` |
| `src/pages/mrf/MRFDashboard.tsx` | New disposition options + unserviceable → kg/material prompt; new Scrap nav tab |
| `src/pages/mrf/components/MRFAssetLedgerPage.tsx` | Optional approval-reference column / link |
| `src/services/api.ts` | New `getAssetScrapStocks`, `updateAssetScrapStock`, `approveAssetScrapSale`, `sellAssetScrapBatch`, `getAssetScrapSales` |

---

## 13. Implementation Status (2026-09-15)

**Schema / DB**
- Added `AssetScrapStock`, `AssetScrapSaleTransaction`, `AssetScrapStockSnapshot` (+ `SchoolYear` relations) to `schema.prisma`.
- New migration `server/prisma/migrations/20260915160000_asset_scrap_recovery/migration.sql`; applied to the dev DB via `prisma db execute` and `prisma generate`.

**Backend**
- New `server/src/routes/asset-scrap.routes.ts` (registered at `/api/asset-scrap`): GET stocks (auto-seeds 7 materials), PATCH stocks/:code (add kg / threshold / price), POST approve-sale (admin; hazard-blocked), POST sell-batch (caps at threshold, leaves remainder, logs revenue + reference), GET sales.
- `rollover.service.ts`: snapshots scrap stock closing kg, carries forward as opening balances, tags untagged scrap sales, and clears pending sale approvals (mirrors `MarketStockSnapshot`).

**Frontend**
- New `src/hooks/useAssetScrap.ts` and `src/pages/mrf/components/AssetScrapStockTab.tsx` (material cards, Ready-to-Sell, admin Approve with reference, Sell Scrap, hazard banner, sales ledger).
- MRF nav: new **Scrap Stock** tab (`DashboardLayout.tsx` + `MRFDashboard.tsx`).
- Complete Task modal: the 3 old outcomes replaced with the DepEd/COA-aligned dispositions (grouped Reuse/Disposal); **"Declared Unserviceable → Scrap"** shows **Material + Weight (kg) — optional** and, on completion, records the asset in the ledger **and** (if a weight is entered) adds the kg to scrap stock. Legacy outcome strings still map.
- **"Weigh Scrap"** button in the Scrap Stock tab: pick material + kg to add scrap any time (supports "carry to MRF first, weigh later"). Task completion no longer requires a weight.

**Verified**
- Scrap API end-to-end: seed 7 materials → add 60 kg → approve (ref) → sell capped at 50 kg for ₱600, remainder 10 → sales ledger populated → **e-waste approve blocked (HAZMAT)**.
- Scrap Stock tab renders all 7 materials incl. the e-waste hazardous banner (browser check).
- `npm run build`, `npm --prefix server run build`, `npm run lint` (0 errors) pass.

**Not runtime-tested**
- Rollover snapshot/carry-forward (mirrors the existing market-stock path; validated by build + code review).
