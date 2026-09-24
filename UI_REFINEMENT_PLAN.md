# S.O.R.T. Admin Console UI/UX Refinement & Overhaul Plan

> **SUPERSEDED**: This plan is largely implemented. Remaining unshipped deltas are folded into `UI_POLISH_PLAN.md` (Admin Console UI Polish & Modularization Plan).

> **Scope**: UI & Visual Aesthetics Optimization for the Admin Console (Operational & Collection Performance Tab & Dashboard Shell)  
> **Status**: Planning & Architecture Phase (No Code Modifications)  
> **Target Date**: September 2026

---

## 1. Executive Summary & Aesthetic Assessment

Based on analysis of the current live UI screenshots for the **Operational & Collection Performance** dashboard:

### What Works Well
- **Modern Brand Tokens**: Rich evergreen (`#00271D`) headers and vibrant teal (`#00A77C`) accents provide a strong eco-tech identity.
- **Glassmorphic Panels**: Clean white frosted surfaces (`bg-white/90 backdrop-blur-md border border-white/80`) create good baseline separation.
- **2026 Radius Consistency**: Generous `rounded-3xl` and `rounded-2xl` corners match contemporary design standards.

### Critical Visual & UX Deficiencies
1. **Pill Badge Cacophony**: Cards are overloaded with loud, saturated status pills (`↗ Live Sync`, `⟳ 0%`, `🏆 Top Grade`, `↗ Market Sync`, `81 Student Profiles`, `🏆 Top Leader`, `2 Grades Configured`, etc.). They fight for visual dominance against the actual numbers.
2. **Irrelevant / Artificial "Target Goals"**: The bottom-right module contains static hypothetical goals (*Monthly Collection Target 50 kg*, *Monthly Revenue Target ₱5,000*, and a *Set Targets* button) that do not reflect real-time campus operational needs.
3. **Heavy Chart Placeholders in "Monthly Collection Volume"**: The vertical month columns feature full-height light-teal container backgrounds (`#00A77C]/15`). When months have `0.0 kg` of data, they appear like solid filled bars or batteries rather than empty chart slots.
4. **Header Bar Micro-Polish**: The `Purge Test Data` button is a prominent high-contrast pink capsule that pulls attention away from primary metrics and search/notification controls.
5. **Card Height Asymmetry**: The top 4 KPI cards and middle modules exhibit subtle vertical discrepancies, reducing the "enterprise" feel.

---

## 2. Proposed Architectural Changes

### A. Removal of Target Goals Elements
- **Remove**: The `Set Targets` action button and its popup configuration modal.
- **Remove**: The `Operational Target Goals` card with static monthly thresholds.

### B. Replacement Card: "Campus Hotspots & Facility Status"
Replace the bottom-right 5-column slot with an actionable, real-time facility monitoring module:
- **Card Title**: `Campus Hotspots & Facility Load`
- **Subtitle**: `Real-time waste accumulation zones & dispatch status`
- **Core Elements**:
  1. **Top Hotspot Locations**: Dynamic grouping of reports by `locationName` (e.g., *Cafeteria Quadrangle*, *Senior High Building*, *East Gymnasium*).
  2. **Urgency Indicators**: Compact status pills showing `High Priority / Overdue` vs. `Normal` reports.
  3. **Direct Operational Action**: A quick-action button linking directly to the **Bin Map** (`admin-bin-map`) or **MRF Dispatch** queue.

---

## 3. Visual Layout Blueprint

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  HEADER: S.O.R.T. Admin Console                 [Purge (Ghost)]   [Alerts (Bell)]   [Admin Capsule]    │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  TITLE ROW: Operational & Collection Performance            [Timeframe: This Month | Quarter | All]   │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  HERO KPI ROW (4 Standardized Equal-Height Cards)                                                      │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ ┌────────────────────────┐ │
│  │ Total Campus Reports │ │ Dispatched Tasks     │ │ Top Active Grade     │ │ Total Recyclable Value │ │
│  │ 4                    │ │ 0 / 4                │ │ Grade 8              │ │ ₱0.00                  │ │
│  │ 2 Student • 2 Teacher│ │ 4 pending review     │ │ 50.0% Share          │ │ 0.0 kg processed       │ │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ └────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  MIDDLE SECTION (12-Column Grid)                                                                       │
│  ┌───────────────────────────────────────────────┐ ┌─────────────────────────────────────────────────┐  │
│  │ Participation by Grade Level (7 Cols)         │ │ Recyclable Waste Composition (5 Cols)           │  │
│  │ - Refined slim progress tracks (h-1.5)        │ │ - Segmented material distribution bar           │  │
│  │ - Registered student cohort breakdown         │ │ - Itemized kg & PHP revenue breakdown           │  │
│  │ - Clean rank badge for top cohort             │ │ - Total estimated valuation summary             │  │
│  └───────────────────────────────────────────────┘ └─────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  BOTTOM SECTION (12-Column Grid)                                                                       │
│  ┌───────────────────────────────────────────────┐ ┌─────────────────────────────────────────────────┐  │
│  │ Monthly Collection Volume (7 Cols)            │ │ Campus Hotspots & Facility Load (5 Cols) [NEW]  │  │
│  │ - Slim modern bars (w-6 to w-8)               │ │ - Top high-frequency report areas               │  │
│  │ - Subtle dotted baseline grid                 │ │ - High Priority vs Standard queue breakdown     │  │
│  │ - Clean hover tooltips with weight & items    │ │ - Direct shortcut to Bin Map & MRF dispatch     │  │
│  └───────────────────────────────────────────────┘ └─────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component-Level Design Specifications

### 1. Header Bar (`DashboardLayout.tsx`)
- **Purge Button**: Transform from high-contrast pink pill to a subtle ghost button:
  `text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-300 bg-white/60 px-3 py-1.5 rounded-full text-xs font-semibold`
- **User Capsule**: Group avatar, name, and role into a cohesive bordered capsule:
  `bg-white/80 border border-slate-200/80 px-2.5 py-1.5 rounded-full shadow-xs`

### 2. Hero KPI Cards (`AdminImpactTab.tsx`)
- **Card Container**: `h-full flex flex-col justify-between p-5 bg-white/90 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all`
- **Status Micro-Badges**: Replace saturated badges with subtle indicators:
  - Total Reports: `text-[11px] font-medium text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-200/60`
  - Dispatched Tasks: `text-[11px] font-medium text-sky-700 bg-sky-50/80 px-2 py-0.5 rounded-full border border-sky-200/60`
- **Typography Scale**:
  - Metric Value: `text-3xl font-extrabold tracking-tight text-[#00271D]`
  - Metric Label: `text-[11px] font-bold uppercase tracking-wider text-[#00271D]/60`

### 3. Monthly Collection Bar Chart (`AdminImpactTab.tsx`)
- **Background Container**: Remove `bg-[#00A77C]/15` full-height columns.
- **Bar Styling**: Use a clean baseline axis (`border-b border-gray-100`) with slim bars (`w-7 bg-[#00A77C] rounded-t-md`).
- **Empty Months**: If a month has `0 kg`, render an ultra-subtle baseline notch (`h-1 bg-gray-200 rounded-full`) instead of an illusory tall pill.

### 4. New "Campus Hotspots & Facility Load" Card
- **Structure**:
  ```tsx
  <div className="lg:col-span-5 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-orange-50 rounded-xl text-[#FF5722]">
            <MapPin size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#00271D]">Campus Waste Hotspots</h3>
            <p className="text-xs text-[#00271D]/50">High-frequency report zones requiring MRF attention</p>
          </div>
        </div>
      </div>
      
      {/* Dynamic Hotspot Zone List */}
      <div className="space-y-2.5 mt-5">
        {/* Hotspot rows ranked by open report count */}
      </div>
    </div>
    
    {/* Action Footer linking to Bin Map */}
    <div className="pt-3 border-t border-[#00271D]/10 flex items-center justify-between text-xs">
      ...
    </div>
  </div>
  ```

---

## 5. Design System Compliance Checklist
- [x] **Base Background**: `#F9F3F0` with subtle organic backdrop waves (`#e0f2ec` & `#d1f0e4`).
- [x] **Primary Font & Contrast**: Rich evergreen `#00271D` for headings and primary metrics.
- [x] **Teal Action Token**: `#00A77C` for primary action buttons, active navigation, and positive indicators.
- [x] **Gold Accent**: Reserved strictly for `#C69B26` on genuine rank 1 / achievement indicators.
- [x] **Strict No-Emojis Rule**: Exclusively crisp SVG icons from `lucide-react`.
- [x] **1,000-Line Code Constraint**: Keep `AdminImpactTab.tsx` and all modified files strictly below 1,000 LOC.

---

## 6. Implementation Readiness
This plan is preserved for future execution. When you decide to implement this overhaul:
1. Update `AdminImpactTab.tsx` to remove goal state, modal, and cards, and introduce the Hotspots module.
2. Polish `DashboardLayout.tsx` header actions.
3. Validate layout responsiveness across desktop and mobile screens.
4. Execute `npm run build` to confirm zero TypeScript and bundle errors.
