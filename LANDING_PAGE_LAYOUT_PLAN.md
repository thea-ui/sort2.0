# SORTv2 Landing Page Layout De-Cluttering & Structural Re-Architecture Plan

> **Scope**: Structural Layout & Breathing Room Optimization for the Public Landing Page  
> **Status**: Planning & Architecture Phase (Plan Only — No Code Modifications)  
> **Target Date**: September 2026  
> **Brand Design Tokens**: Base `#F9F3F0`, Evergreen `#00271D`, Teal Action `#00A77C`, Gold Accent `#FFAB00` / `#C69B26`

---

## 1. Root-Cause Layout Diagnostics: Why It Feels "Cramped" & "Not Giving"

From analyzing the live viewport screenshots, the contents and copy are solid, but the layout suffers from **three critical structural flaws**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [CRAMP 1] DUAL SIDEBAR TRAP (Screen 3 & 4)                                   │
│  Upcoming Campaigns (Narrow) | How SORT Works (Narrow) | Login Card (Narrow) │
│  ─────────── 3 narrow, squished vertical columns choking each other ───────  │
├──────────────────────────────────────────────────────────────────────────────┤
│ [CRAMP 2] SQUISHED INCIDENT TICKER                                           │
│  Recent Incident Reports is squeezed underneath the Login form in a narrow   │
│  card, forcing status text and timestamps to truncate or wrap awkwardly.     │
├──────────────────────────────────────────────────────────────────────────────┤
│ [CRAMP 3] ORPHANED LEADERBOARD CANYON (Screen 4)                             │
│  Leaderboard takes 65% of the screen with a massive grey podium, while the   │
│  right 35% is completely trapped under stacked widgets, creating an awkward  │
│  vertical zigzag that looks unbalanced and cluttered.                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

1. **The "Three Narrow Columns" Grid Crash:**
   - Instead of broad, breathing editorial sections, `Upcoming Eco Campaigns`, `How SORT Works`, and `SORT Login` are crammed side-by-side into a 3-column row where each column is too narrow for comfortable reading.
2. **Double Card Nesting:**
   - Multiple small cards are packed inside larger cards with differing vertical heights, producing uneven gutter lines and visual friction.
3. **No Visual Hierarchy in Section Cadence:**
   - Every section currently has roughly the same white background container style, creating an endless pile of white cards without clear section pacing (e.g., alternating between full-width immersive bands and clean card grids).

---

## 2. The New Clean 4-Tier Layout Architecture

To make the layout feel expansive, clean, and modern, we reorganize the page into **4 distinct, purposeful bands** with deliberate negative space (`gap-10` to `gap-16` / `py-20` to `py-28`):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: THE COMMAND HERO (Split 60/40)                                       │
│ ┌──────────────────────────────────────┐  ┌────────────────────────────────┐ │
│ │ Bold Headline & Purpose              │  │ Interactive Eco-HUD Card       │ │
│ │ Access Dashboard & How It Works CTAs │  │ Or Integrated Clean Login      │ │
│ └──────────────────────────────────────┘  └────────────────────────────────┘ │
│ ── Consolidated Live Telemetry Ribbon (Full Width Floating Pill) ─────────── │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TIER 2: ASYMMETRICAL PLATFORM CAPABILITIES (3-Card Bento Layout)             │
│ ┌──────────────────────────────────────┐  ┌────────────────────────────────┐ │
│ │ Featured: Interactive Bin & Zone Map │  │ Live Incident Dispatch Stream  │ │
│ │ (Wide 8-col card with visual preview)│  │ (Clean 4-col real-time card)   │ │
│ ├──────────────────┬───────────────────┴──┴──────────────┬─────────────────┤ │
│ │ Gamified Rewards │ Classroom Audits                    │ MRF Diversion   │ │
│ └──────────────────┴─────────────────────────────────────┴─────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TIER 3: THE COMMUNITY & LOGISTICS HUB (2-Column Balanced Rhythm)             │
│ ┌──────────────────────────────────────────────────┐ ┌─────────────────────┐ │
│ │ CAMPUS HALL OF FAME (60% Width)                  │ │ UPCOMING CAMPAIGNS  │ │
│ │ • 3D Metallic Podium (1st, 2nd, 3rd)             │ │ & EVENTS (40% Width)│ │
│ │ • Top 10 Student Table with clean pill rows      │ │ Clean vertical      │ │
│ │   and achievement tags                           │ │ calendar cards      │ │
│ └──────────────────────────────────────────────────┘ └─────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TIER 4: WORKFLOW STRIP ("HOW SORT WORKS") & QUICK ACCESS DRAWER              │
│ ── Clean 4-Step Horizontal Pipeline (Report ➔ Pin ➔ MRF ➔ Points) ─────────── │
│ ── High-Contrast Clean Footer with Status Telemetry ──────────────────────── │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Layout De-Cluttering Blueprint

### A. Fix Tier 1: Hero & Metric Breathing Room
* **Current Cramp:** Hero text is crowded on the left, empty on the right, and the 4-stat boxes sit immediately below it without visual separation.
* **Neat Layout Solution:**
  * **60 / 40 Proportional Split:**
    * **Left 60%:** Headline with generous vertical leading (`leading-[1.15]`), breathing description, and aligned pill buttons.
    * **Right 40%:** Either the **Interactive Campus HUD** or the **SORT Sign-In Card** cleanly framed as the hero's interactive counterpart (no more floating login randomly halfway down the page!).
  * **Decoupled Telemetry Bar:** Give the 4-metric bar its own dedicated row below the hero with top/bottom margins (`mt-16 mb-24`), styled as an ultra-clean floating glass ribbon (`rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md p-6 shadow-sm`).

### B. Fix Tier 2: Platform Capabilities (From 6 Identical Boxes to Clean Bento)
* **Current Cramp:** 6 small, identical cards create a repetitive "wall of text".
* **Neat Layout Solution:**
  * Switch to a **Bento Grid** with clear visual pacing:
    * **Row 1:** 
      * Left (8 cols): *Live Bin & Campus Zone Map* with an interactive mini-map preview.
      * Right (4 cols): *Recent Incident Reports* (moved here where it naturally belongs as an operational capability showcase, with generous line heights and distinct status pill badges).
    * **Row 2:** 
      * Three equal cards (4 cols each): *Gamified Eco-Points*, *Classroom Compliance Audits*, and *MRF Operations*.

### C. Fix Tier 3: Un-Cramping "How SORT Works" & "Campaigns"
* **Current Cramp:** "Upcoming Eco Campaigns" and "How SORT Works" are crammed next to each other in narrow, hard-to-read vertical cards.
* **Neat Layout Solution:**
  * **Elevate "How SORT Works" into a Horizontal Step Journey:**
    * Place it across the full container width with a connected 4-step timeline:
      `[1. Capture & Report]` ➔ `[2. Pin on Campus Map]` ➔ `[3. MRF Dispatch Action]` ➔ `[4. Claim Eco-Points]`.
    * Each step gets its own icon capsule and clean title without feeling squeezed.
  * **Pair "Upcoming Eco Campaigns" with the "Campus Hall of Fame":**
    * Instead of a 3-way vertical column battle, create a balanced **60/40 Split**:
      * **Left (60%):** **Campus Hall of Fame (Leaderboard)** — gives the podium room to breathe and displays the student list in wide, readable rows without horizontal scrolling or awkward truncation.
      * **Right (40%):** **Upcoming Eco Campaigns** — calendar dates (`JUL 19`, `JUL 22`) sit cleanly on the left of each campaign card with rich descriptions and registration badges.

### D. Fix the Auth Placement ("SORT Login")
* **Current Cramp:** The login box sits in the middle of the feed, choking the adjacent cards and leaving massive white voids below it.
* **Neat Layout Solution:** Choose between two clean architectural patterns:
  * **Pattern A (Modern SaaS Hero Integration):** Dock the Login card on the **Hero's right flank** (Tier 1). Users land on the page, see the value proposition on the left, and have instant 1-click access or login on the right. The rest of the page remains 100% public, spacious, and uncluttered.
  * **Pattern B (Slide-Over Drawer):** Remove the in-page login card altogether. Clicking `"Sign In"` in the top navigation or `"Access Dashboard"` smoothly glides open a sleek frosted glass drawer from the right. This leaves the entire landing page with a pristine, wide 12-column layout.

---

## 4. Spacing, Rhythm & Container Specifications

| Container Element | Current Setting | Recommended 2026 Setting | Rationale |
| :--- | :--- | :--- | :--- |
| **Max Page Width** | `max-w-7xl` | `max-w-6xl` (Hero & Hubs) | Pulls content inwards, preventing wide monitors from stretching text uncomfortably |
| **Section Vertical Padding** | `py-10` (~40px) | `py-20` to `py-24` (80px–96px) | Gives sections deliberate breathing room and stops content crowding |
| **Grid Gutters (Gaps)** | `gap-4` (16px) | `gap-8` to `gap-10` (32px–40px) | Prevents neighboring cards from visual collisions |
| **Card Padding** | `p-4` / `p-5` (16–20px) | `p-7` to `p-8` (28–32px) | Adds generous internal whitespace around titles, icons, and text |
| **Card Corner Radius** | Mixed | Systemized: Container `rounded-3xl` (24px), Inner `rounded-2xl` (16px) | Clean nested curvature hierarchy |

---

## 5. Before vs. After Visual Flow Comparison

```
CURRENT SQUISHED FLOW                PROPOSED EXPANSIVE 2026 FLOW
─────────────────────                ────────────────────────────
[ Hero (Left Only) ]                 [ Hero 60/40 Split (Copy + Interactive HUD/Auth) ]
[ Redundant 4 Metrics ]              [ Unified Floating Telemetry Ribbon ]
[ 6 Identical Cards Grid ]           [ Dynamic Bento Grid (Visual Map + Incident Feed) ]
[ 3-Column Squeeze:                  [ Full-Width 4-Step "How It Works" Journey ]
  Campaigns | How Works | Login ]    [ Balanced 60/40 Community Hub:
[ Asymmetrical Leaderboard                 Campus Hall of Fame (60%) | Eco Campaigns (40%) ]
  with Dead Space on Right ]         [ Clean Floating Navbar + Modern Minimal Footer ]
```

---

## 6. Summary: Key Improvements

1. **No More Choked Columns:** Eliminated the 3-column squeeze by moving "How SORT Works" into a horizontal timeline.
2. **Balanced Heights:** The Leaderboard and Campaigns share a natural 60/40 balance, completely removing the awkward dead space near the footer.
3. **Intentional Spacing:** Doubled vertical section padding (`py-20`) and card gutters (`gap-8`) for an airy, premium editorial feel.
4. **Purpose-Driven Auth:** Placed the login card either directly in the Hero or as a slide-over drawer so it never interrupts the narrative flow of the page.
