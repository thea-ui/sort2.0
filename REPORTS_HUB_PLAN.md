# Reports Hub Plan — Folder Browser, PDF/Print, and Sales Ledger

> **Goal:** Turn the sidebar into two clear things: a new **Reports** tab that works like a folder browser (Waste / Asset / Ledger), and rename the old admin queue to **Verify Reports**.
> **Status:** Plan only — nothing implemented yet.

---

## 1. What you asked for (in plain words)

1. The **Reports** tab should not be one long list. It should look like **folders inside folders**.
2. First level shows the **type of report**: Waste, Asset (and a General/Ledger area).
3. Open a folder and it shows **smaller folders with a preview count** ("how many reports").
4. Keep opening folders until the last one that has reports.
5. Clicking that last folder opens a **new browser tab** showing the **full table of reports**.
6. On that new tab you can **Download as PDF** or **Print directly**.
7. All data must have **filters in order** (school year, date range, status, search, sort).
8. Dates must read like **Jan 01, 2026** — never `2026-01-01` or `01/01/2026` style.
9. Inside the Reports tab there is also the **Ledger** — records of **scraps sold / recyclables sold**, also categorized, also downloadable.
10. The **existing** Reports tab (the one where admin verifies reports) gets a new name. We suggest **Verify Reports**.

---

## 2. The suggested name for the old tab

| Option | Why |
| --- | --- |
| **Verify Reports** (recommended) | Says exactly what it does: admins verify, dispatch, dismiss reports. |
| Report Queue | Short, but "queue" is vague for non-technical users. |
| Review & Verify | Friendly, a bit long for the sidebar. |
| Action Center | Too broad — sounds like it manages everything. |

Plan: rename sidebar entry + page title from **"Reports" → "Verify Reports"**. The new hub takes the name **"Reports"**.

---

## 3. The folder tree (what the user will actually see)

```
REPORTS (new hub)
│
├── Waste Reports                         [N reports]
│   ├── Biodegradable                     [N reports]
│   ├── Non-Biodegradable                 [N reports]
│   └── Recyclable                        [N reports]
│       ├── PET Bottles                   [N reports]  ← leaf → new tab table
│       ├── Aluminum Cans                 [N reports]  ← leaf → new tab table
│       ├── Cardboard & Paper             [N reports]  ← leaf → new tab table
│       └── Glass Bottles                 [N reports]  ← leaf → new tab table
│
├── Asset Reports                         [N reports]
│   ├── Furniture                         [N reports]
│   │   ├── Chairs                        [N reports]  ← leaf → new tab table
│   │   ├── Tables                        [N reports]  ← leaf → new tab table
│   │   └── ... (from Item Presets)
│   ├── Electronics                       [N reports]
│   │   ├── LED TV / Monitor              [N reports]  ← leaf
│   │   ├── Laptop                        [N reports]  ← leaf
│   │   └── ... (from Item Presets)
│   ├── Fixtures / Equipment / Appliances / Other ...
│
└── Ledger (General)                      [N records]
    ├── Recyclables Sold                  [N records]
    │   ├── PET Bottles                   [N sales]    ← leaf → new tab table
    │   ├── Aluminum Cans                 [N sales]
    │   ├── Cardboard & Paper             [N sales]
    │   └── Glass Bottles                 [N sales]
    ├── Asset Scrap Sold                  [N records]
    │   ├── Non-Ferrous Metal             [N sales]
    │   └── Other materials ...
    └── (later) Walk-in Bottle Turnovers / Points Summary
```

Rules:

- Every folder card shows **name + count + latest date** ("Last report: Jan 01, 2026").
- Folders with **0 reports** still show, greyed out, with "No reports yet". Nothing should disappear — users find their way by seeing the full shape.
- The **leaf folder** (the deepest one that holds reports) is the only click that opens the new tab.
- Breadcrumbs at the top: `Reports / Waste / Recyclable / PET Bottles`.

---

## 4. Screen by screen (what each level looks like)

### Level 1 — Reports hub (root)

- Three big folder cards, styled like the image you attached (rounded rows, warm background):
  - **Waste Reports** — "Biodegradable, Non-Biodegradable, Recyclable"
  - **Asset Reports** — "Furniture, Electronics, Fixtures, Equipment, Appliances"
  - **Ledger (General)** — "Scraps sold and sales records"
- Each card: icon, title, one-line subtitle, count badge, latest date, chevron.
- A filter bar sits above the cards (see section 6).

### Level 2 — Report-type folder (e.g. Asset Reports)

- List of category folder rows (same row style as Level 1).
- Example: Electronics — "8 items · 24 reports" — matches your second image's layout.
- Reason: the second screenshot is the Settings > Asset Categories page. We reuse the same row design but the right side shows **report count** instead of Enabled/Edit buttons.

### Level 3 — Subcategory folder (e.g. Recyclable → materials, Asset category → items)

- Same row design, one level deeper.
- For **Recyclable**, the four material folders come from the existing Recycle Market categories (PET Bottles, Aluminum Cans, Cardboard, Glass Bottles) — these already exist in the system.
- For **Assets**, the item folders come from **Item Presets** in Settings (exactly the rows in your second image: LED TV/Monitor, Laptop, etc.).

### Level 4 — Leaf folder → NEW TAB with the detailed table

- Clicking a leaf folder opens a **new browser tab** (the old tab stays where it was).
- The new tab shows a clean, printable page:
  - School name + logo (tenant branding)
  - Title: "Waste Reports — Recyclable — PET Bottles"
  - Filter summary line: "School Year 2025–2026 · Jan 01, 2026 to Oct 13, 2026"
  - Generated on: "Oct 13, 2026 · 3:45 PM"
  - The full table (see section 5)
  - Footer totals row
  - Buttons (hidden when printing): **Download PDF**, **Print**, **Download CSV**

---

## 5. The detailed table format (extracted information)

### Waste report table

| Date | Report ID | Title | Stream | Location | Reporter | Status | Urgency | Weight (kg) | Points |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Jan 01, 2026 | rep-1042 | Scattered PET bottles | Recyclable | Covered Court | Juan Dela Cruz (Grade 9 – A) | Collected | High | 3.5 | 10 |

### Asset report table

| Date | Report ID | Item | Asset Category | Issue | Location | Reporter | Status | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Jan 01, 2026 | rep-2011 | Laptop | Electronics | Broken screen | Computer Lab 2 | Maria Santos (Faculty) | Resolved | Repaired |

### Ledger (sold scraps) table

| Date | Category / Material | Weight (kg) | Price per kg | Revenue | Buyer | School Year |
| --- | --- | --- | --- | --- | --- | --- |
| Jan 01, 2026 | PET Bottles | 52.0 | ₱18.00 | ₱936.00 | Green Metal Trading | 2025–2026 |

Totals row at the bottom: total reports, total kg, total points (or total revenue for the ledger).

**Note:** In the system, asset reports currently do not store their asset category as a real field — they only carry a text marker in the description (like `[PILLAR: FURNITURE]`). Section 9 explains how we fix that.

---

## 6. Filters ("in order")

Filter bar shown at Levels 1–3, and its choices are carried into the new tab so the printout matches what you see.

Order of filters (left to right):

1. **School Year** — dropdown, default "All years", with a quick chip for the Active year.
2. **Date range** — From / To, both shown as `Jan 01, 2026`. Quick presets: Today, This Week, This Month, This School Year.
3. **Status** — multi-select: Pending, Dispatched, Collected, Resolved, Dismissed, Expired.
4. **Search** — reporter name, location, title, ID.
5. **Sort** — Newest first (default), Oldest first, Category A–Z, Weight high–low.

Behavior rules:

- Folder **counts respect the filters**. If you filter to "Pending only", the folders show only pending counts. This is the key "preview" behavior you asked for.
- Filters live in the URL on the new tab page, so refreshing or sharing the page keeps the same view.
- A "Clear filters" button resets everything.

---

## 7. Dates everywhere

- Add one new shared formatter: `formatLongDate()` → **`Jan 01, 2026`** (leading zero on the day).
- Use it in: the new Reports hub, folder cards, the print pages, and tables.
- Keep the old formats where they already exist (`formatShortDate`, `formatDateTime`) so we do not break other pages. The new hub simply stops using them.
- Time stays like `3:45 PM` where a time is needed.

---

## 8. The Ledger inside Reports (sold scraps)

The data already exists in the system — we only need to present it:

| Folder | Data source (already in DB) | Meaning |
| --- | --- | --- |
| Recyclables Sold → per material | `recycle_sale_transactions` | Every sale of accumulated recyclables (PET, cans, cardboard, glass): kg, price/kg, revenue, buyer, date |
| Asset Scrap Sold → per material | `asset_scrap_sale_transactions` | Sales of unserviceable asset scrap weighed by material (e.g. non-ferrous metal) |

- Same folder → leaf → new tab → table → PDF/Print/CSV flow as reports.
- Ledger rows also appear in the School Years ledger today (Market Sales sheet) — we keep that as the archive view and point it to the same data.
- Later additions (not in first version): Walk-in Bottle Turnovers, Points Ledger summary.

---

## 9. Two data gaps we must fix (important)

### Gap 1 — Asset reports have no real asset category

Today asset reports only embed `[PILLAR: FURNITURE]` inside the description text. That is not reliable for folders.

Plan:
1. **First version (now):** derive the folder from the pillar marker + match the title against Item Presets (keyword match). Good enough to build the UI and counts.
2. **Proper fix (next):** add two nullable fields to the `reports` table — `asset_category_code` and `asset_item_name` — and start saving them when an asset report is created. Run a small backfill for old reports using the pillar marker. Then folders use real fields.

### Gap 2 — Recyclable reports have no material (bottles/cans/etc.)

The "Recyclable" stream is one flag; the material name (PET, cans, cardboard, glass) is only in the free text.

Plan:
1. **First version (now):** classify by keywords in the title/description (bottle → PET, can/metal → Cans, cardboard/paper → Cardboard, glass → Glass).
2. **Proper fix (next):** ask the reporter to pick a material when they choose Recyclable (dropdown from the same market categories), store it on the report.

Both fixes are small and are listed as Phase 5 below.

---

## 10. The new-tab print page (how it works technically, simply)

- We add one new route path: `/reports/print` with query details, e.g.
  `/reports/print?type=waste&stream=RECYCLABLE&material=pet_plastic&from=2026-01-01&to=2026-10-13`
- The "leaf folder" click calls `window.open(...)`.
- The new tab opens a **standalone page** — no sidebar, no header — just the letterhead, summary, table, totals, and the action buttons.
- **Download PDF** and **Print** both use the browser's print dialog (`Ctrl+P` behavior). The button labeled "Download PDF" opens the same dialog and the user picks "Save as PDF". This needs no new library and gives perfect text output.
- If the browser blocks the pop-up, we show a small toast with an "Open report page" link instead.
- Optional later: a real server-generated PDF (the server already uses `pdfkit` for certificates) so the file matches the school's letterhead exactly. Recommended as Phase 6, not required on day one.

---

## 11. Where the code will live (keeps files small)

Following the 1,000-line rule, the new tab is its own module folder:

```
src/pages/admin/components/reports-hub/
  ReportsHubTab.tsx          ← switches between folder levels
  ReportFolderCard.tsx       ← one folder row (image-style)
  ReportsBreadcrumbs.tsx
  ReportsHubFilterBar.tsx    ← the filter bar
  ReportDetailTable.tsx      ← the detailed table (shared with print page)
  useReportFolders.ts        ← builds the tree + counts from reports
  reportFolderTypes.ts       ← folder model types
  classifyReport.ts          ← stream + material + asset category logic
  ledgerFolders.ts           ← sold scraps folders (market + asset scrap)

src/pages/
  ReportPrintPage.tsx        ← the standalone new-tab page
```

Also touched (small edits):

- `src/components/layout/dashboardNav.ts` — rename old tab, add new hub entry, mobile items.
- `src/pages/admin/AdminDashboard.tsx` — render hub for the new tab id.
- `src/components/layout/DashboardLayout.tsx` — notification click now goes to **Verify Reports**.
- `src/hooks/usePathRoute.ts` — recognize `/reports/print`.
- `src/utils/dateFormat.ts` — add `formatLongDate()` ("Jan 01, 2026").

---

## 12. Phases (each phase is shippable on its own)

| Phase | Work | Result |
| --- | --- | --- |
| 0 | Rename old tab to **Verify Reports**; add new **Reports** sidebar entry + route | No behavior change, just naming and space for the hub |
| 1 | Folder browser UI: Levels 1–3 with counts, breadcrumbs, empty folders greyed out | Users can browse the tree |
| 2 | Filter bar (school year → date → status → search → sort); counts react to filters | "Preview" works the way you described |
| 3 | Leaf click → new tab print page with table, totals, Download PDF / Print / CSV; `formatLongDate` | The main request is fully working |
| 4 | Ledger folders (Recyclables Sold + Asset Scrap Sold) using existing sales data | Sold scraps are categorized and downloadable |
| 5 | Data fixes: save `asset_category_code`, `asset_item_name`, recyclable material on new reports; backfill old ones | Counts become exact, no keyword guessing |
| 6 | (Optional) Server-side PDF with school letterhead; server-side summary endpoint if data grows big | Official-looking PDFs |

Verification after each phase: `npm run build`, `npm run lint`, `npm run test:unit`, plus a manual pass in the browser of every folder level and the print page.

---

## 13. Acceptance checklist

- [ ] Old tab reads **Verify Reports** and still works exactly as before.
- [ ] New **Reports** tab shows three root folders with live counts and latest dates.
- [ ] Waste drill-down: Waste → stream → (Recyclable only) material → new tab table.
- [ ] Asset drill-down: Asset → category → item → new tab table.
- [ ] Ledger drill-down: Ledger → sold type → material → new tab table.
- [ ] Every leaf opens in a **new tab**; the original tab stays put.
- [ ] New tab has working **Download PDF**, **Print**, and **Download CSV**, with buttons hidden on the printout.
- [ ] All dates show as **Jan 01, 2026** in the hub and print pages.
- [ ] Filters apply in order and the printout matches the filtered set; filters survive refresh.
- [ ] Empty folders show "No reports yet" instead of disappearing.
- [ ] Counts, tables, and totals agree with the Verify Reports queue data.
- [ ] Files stay well under 1,000 lines; lint and build pass.

---

## 14. Open questions (decide before Phase 1)

1. **Folder counts scope:** count all school years by default (recommended, with a School Year filter), or only the active year?
2. **Expired reports:** include them in counts (recommended, since this is the archive) or hide them like in Verify Reports?
3. **Asset subcategory source:** use Item Presets only (recommended) or also allow custom free-text items?
4. **Ledger contents:** start with Recyclables Sold + Asset Scrap Sold only, or include Walk-in Bottle Turnovers in version one?
5. **PDF style:** simple browser print first (recommended), or wait and build the server PDF with letterhead right away?
6. **Sidebar order:** put **Verify Reports** first under MANAGEMENT, then **Reports** below it (recommended), or the other way around?

---

## 15. Implementation Status (2026-10-13)

**Phases 0–4 are implemented and verified in the browser.** Phase 5 (structured report fields)
and Phase 6 (server-side PDF) remain open.

Decisions used (the recommended options from section 14): all school years counted by default,
EXPIRED included in the archive, asset items from Item Presets, ledger = Recyclables Sold +
Asset Scrap Sold, browser print for PDF, Verify Reports listed before Reports in the sidebar.

**What was built**

- Sidebar: the old queue is now **Verify Reports** (`admin-reports`, page title updated);
  the new **Reports** hub lives at `admin-reports-hub` (also the new mobile "Reports" item).
- Hub module `src/pages/admin/components/reports-hub/`:
  `ReportsHubTab`, `ReportFolderCard` (root tiles + drill-down rows), `ReportsBreadcrumbs`,
  `ReportsHubFilterBar`, `useHubReports` (school-year scoping), `useSalesLedger`,
  `reportHubRows` (classification/filtering/summaries), `reportHubFolders` (folder trees),
  `printUrl`, `reportHubTypes`.
- Standalone print page `src/pages/report-print/`: `/reports/print?section=…` renders the
  letterhead, filter summary, detailed table with totals, and **Download PDF / Print /
  Download CSV** (toolbar hidden when printing). Opened in a new tab via `window.open`
  (the cloned session keeps it authenticated); signed-out visitors get guidance instead.
- Dates: new `formatLongDate()` (`Jan 01, 2026`) used across the hub and printouts; the
  report-title is pinned as the document title so "Save as PDF" names the file after the report.
- Filters: school year → date range (+ Today / This Month / This School Year presets) →
  status chips → search → sort. Folder counts react to every filter, and the leaf URL carries
  them so the printout matches.
- Unit tests: `reports-hub/__tests__/reportHub.test.ts` (classification, filters, folder
  counts, ledger grouping, print-URL round trip).

**Verified (browser, live data)**

- Hub root: Waste 1,341 / Asset 446 / Ledger 15 sales, latest dates in long format.
- Waste → Recyclable → PET Bottles (133) opened in a new tab with a 133-row table and totals;
  Glass Bottles (0 reports) is disabled with "No reports yet".
- Asset → Electronics → LCD Projector (63) table; item counts match the category total.
- Ledger → Recyclables Sold → PET Bottles: 5 sales, ₱4,261.00 total.
- Status/School-Year filters change counts (1,802 → 1,267 → 281); CSV download produced
  `sales-ledger-recyclables-sold-pet-bottles.csv`; print media hides the toolbar, keeps the table.
- `npm run build`, `npm run lint` (0 errors), `npm run test:unit` (146 passing) all pass.

**Known deferred items (as planned)**

- Asset reports still derive their category from `[PILLAR: …]` + Item Preset keywords; add
  `asset_category_code` / `asset_item_name` (and a recyclable material field) per Phase 5.

---

## 16. Phase 6 update — direct PDF (certificate-style flow), 2026-10-13

Implemented after review: leaf folders now open a **server-rendered PDF directly in a new tab**,
exactly like the certificate viewer (blob URL → Chrome PDF toolbar with download/print).

- Server: `POST /api/reports/export-pdf` (`report-pdf.service.ts`, pdfkit) renders the posted
  table with the tenant letterhead (Republic/DepEd/region lines, school name, gold rules,
  filter summary, zebra table, repeated headers with "(continued)", totals row, page
  footers "Page X of Y"). Payloads are validated and capped (max 14 columns, 3,000 rows,
  400 chars per cell → 413 with guidance when exceeded).
- Client: `apiService.viewReportPdf` (blob → new tab) and `downloadReportPdf` (file
  download) in `api.ts`. The hub builds the payload from the same filtered rows it is
  showing (`printModel.buildPrintJob` + shared `printColumns`), so the PDF matches the
  on-screen counts exactly.
- The HTML `/reports/print` page stays as the offline fallback (used automatically when the
  export endpoint is unreachable); its "Download PDF" button now downloads the server PDF.
- Verified live: 133-row PET Bottles report → blob tab → 8-page letterhead PDF; 413 guard;
  `%PDF-` magic + `application/pdf`; 4 server unit tests + 13 client hub tests pass.

**Presentation rule — "0 means no data":** an em-dash (`—`) is shown instead of 0 for
Weight (kg) and Points in the hub print view, the PDF, and their totals rows (same for
ledger weight). CSV exports keep the raw numeric 0 so spreadsheets stay analyzable
(`pdfValue` on `PrintColumn` carries the dash text; `csv` stays numeric). The keyword
classifier for recyclable materials also gained word boundaries so e.g. "canteen" no
longer reads as aluminum cans.

---

## 17. Interactive report page + walk-in bottles, 2026-10-13

Revised per review: the leaf folder opens the **interactive report page** in a new tab
(not a bare PDF), so the admin can narrow the data first, then print/download.

- **Filters on the report page:** School Year, From/To dates (+ Today / This Month /
  This School Year presets), **Location** (built from the rows in scope), Status chips,
  search and sort. The URL opened by the hub seeds these; changing them re-renders the
  table and the PDF/CSV use exactly the filtered rows. Status chips and the location
  select hide for sections where they do not apply (walk-ins).
- **Download PDF flow:** the button downloads the file immediately, then a dialog asks
  "Open the PDF in this tab, or stay on this page?" — `Open PDF` replaces the current tab
  with the browser's PDF viewer (Back returns to the filtered report page),
  `Stay here`/Close keeps the current page.
- **Walk-in Bottle records:** `GET /api/walk-ins` gained `schoolYearId`, `from`/`to`
  filters and a 5,000-row cap; the Ledger section now has a **Walk-in Bottles** folder
  (leaf, counted as "turnovers") whose table shows Date, Student, Grade/Section,
  Bottles, Volume (L), Weight (g), Points, Recorded by, with totals.
- Verified live: 262 walk-ins with totals (3,333 bottles / 2,651.19 L / 84,891 g /
  5,234 pts); "This Month" narrowed to 6; PET Bottles 133 → 36 when filtered to
  "IT Building Lobby"; download + dialog + same-tab PDF viewer all work (Back restores
  the filtered page). 151 client tests and 4 server PDF tests pass; build + lint clean.

---

## 18. Inline preview + Download opens the tab, 2026-10-13

Final flow per review — the tables open **inside** the admin tab; the new tab is for downloading:

1. **Leaf folder click → the table replaces the folder list** (normal folder navigation; no
   separate panel below the list, no tab). The table is the app's standard **DataTable**
   (`components/data-table`) — same card shell, muted header band, sortable columns, status
   badges, pagination footer and totals row as the Ledger/Users tables. It shows the full
   filtered set across pages, with the hub filters applied — e.g. PET Bottles:
   "133 filtered records" · "Showing 1 to 10 of 133 results". The breadcrumb gains the leaf name.
2. **Back** pops one level (not to the root) so the admin can return to the folder list and
   pick another category (e.g. Recyclable) — verified: Back from Biodegradable returns to the
   Waste Reports list.
3. **Download (admin)** saves the complete filtered PDF immediately, then asks "Open the PDF
   in this tab, or stay on this page?" — `Open PDF` replaces the admin tab with the PDF
   viewer (Back returns to the leaf table), `Stay here` keeps the admin page. No new tab in
   either path. Verified: auto-download of `waste-reports-recyclable-pet-bottles.pdf`,
   dialog, Stay, and same-tab open (tab count unchanged).

---

## 19. Lean admin tables + row View pop-up, 2026-10-13

Per review, the admin tables now show only the fields that matter for scanning/filtering;
the removed details live in a pop-up and in the PDF:

- **Waste/Asset tables:** Date, Title (Issue for assets), Location, Reporter, Status — the
  report ID, stream, urgency, weight and points columns are gone. Ledger and Walk-in tables
  keep their data columns (weight/revenue/etc. are their substance).
- **View button** on every row (`View ›`, same affordance as the ledger sheets) opens a
  read-only **pop-up** (AppModal, no footer) with the complete detail set — including the
  removed fields: report ID, stream, urgency, weight, points, priced sale fields, etc.
- The **downloaded PDF** still contains every column (Date, Report ID, Title, Stream,
  Location, Reporter, Status, Urgency, Weight, Points), so "download = complete details".

---

## 20. Tidier filter bar, 2026-10-13

The filter area was reduced from two busy rows (chips + counters + dates) to a clean setup:

- **Always visible (one row):** Search · School year · Date preset (All time / Today /
  This month / This school year, "Custom range" appears when a manual range is set) · Sort ·
  **Filters** button · Clear (only when something is active) · the record counter.
- **Behind the Filters button (expandable panel):** Status chips (labeled "Status"),
  the exact From/To date inputs, and Location (report page). The button carries a badge
  with the number of active hidden filters (e.g. `Filters ①`).
- **The Filters control reads as a button:** accent-tinted pill with an accent border,
  sliders icon and a chevron when closed; solid accent with a white badge and the chevron
  flipped up when open.
- Used by both the admin hub and the report page; walk-in sections still hide Status.
- Verified: collapsed bar renders as one row; expanding shows the panel; status chip
  filter narrowed 1,805 → 1,269; the date preset "Today" narrowed to 2; badge counts.

---

## 21. Current-year default, grade filter, status trim, 2026-10-13

- **School year rests on the current year:** the hub filter defaults to the active school
  year (e.g. "2026-2027 (Active)", counter 404 instead of 1,805 across all years) and the
  Clear button resets to it. "All school years" stays selectable in the dropdown; the
  report page's Clear uses the active year too.
- **Grade-level filter:** `GET /api/reports` now returns the reporter's grade level and
  section (`reporterGradeLevel` / `reporterSection`); the hub shows a labeled **Grade**
  chip group in the Filters panel (Grade 7–10 for the demo data). Selecting Grade 8
  narrowed 404 → 121 records; the filter rides in the URL (`grades=Grade 8`) and appears
  in the PDF header as "Grade level: Grade 8".
- Reporter info is richer everywhere: admin table subline, PDF reporter cell and the View
  pop-up now show "Grade 8 · Maka-Diyos" for students (staff still show their role).
- **Status chips trimmed:** Pending and Dispatched removed from the archive's status filter
  (they are operational states handled in Verify Reports); the chips are now Collected,
  Resolved, Dismissed, Expired.

