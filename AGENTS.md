# AI Agent Guidelines for SORTv2

This configuration defines the strict operational rules and engineering guidelines for AI agents working in this repository.

## 1. 📏 Strict File Size Constraint
- **CRITICAL RULE:** No single source code file may approach or exceed **1,000 lines of code**.
- **Action:** Proactively modularize features into controllers, custom React hooks, and atomic UI sub-components before they grow too large.

## 2. 🧼 Code Quality & Cleanliness
- **State Management:** Keep state local where possible. Abstract complex logic into custom React hooks. Avoid prop drilling by utilizing context or modern React state features appropriately.
- **Data Fetching:** Prevent request waterfalls by fetching data in parallel where possible (e.g., using `Promise.all` or appropriate query library batching).
- **Architecture:** Follow the defined boundaries in `PLANNING.MD`. Since the current phase is the UI Overhaul Phase, use localized mock-data abstractions before finalizing real connections.

## 3. 🎨 Design & Styling (Official Brand Design Tokens & Guidelines)
- **STRICT DESIGN TOKENS:**
  - **Background Base:** `#F9F3F0` (with soft organic backdrop waves `#e0f2ec` & `#d1f0e4` for visual depth)
  - **Main Text / Headings (Primary):** #111827 (Neutral near-black; fixed regardless of tenant brand - brand color drives buttons/links/badges only. #00271D remains the default brand primary)
  - **Accent / Buttons / Links (Action):** `#00A77C` (Luminous vibrant teal-green)
  - **Secondary / Badges / Ranks (Gold Accent):** `#C69B26` (Saturated green-gold)
  - **Text Primary:** `#00271D` (or `#00A77C` for links/accents)
  - **Surface / Cards:** Crisp white with clean modern borders (`border border-white/80` or `border-[#00271D]/10`).
  - **2026 Border Radius System:**
    - Navigation Capsule & Active Tabs: `rounded-full`
    - Hero Cards & Main Containers: `rounded-3xl` (`24px`)
    - Content Cards & Modules: `rounded-2xl` (`16px` / `20px`)
    - Buttons, Badges & Inputs: `rounded-xl` (`12px`) or `rounded-full`
- **SINGLE-ACCENT CONTENT SYSTEM (encodes tenant branding):**
  - **Cards & content accents:** exactly one shade family for all content decoration — the tenant branding accent (`--accent`, `--accent-light`, `--accent-dark`, `--accent-darker`; default `#00A77C`) with `/5`–`/25` alpha tints for fills and borders. Never introduce per-module hues (no rainbow indicators, charts included).
  - **Major UI displays (brand identity):** tenant branding (`--primary`, `--accent`, `--gold`, logo, school name) drives shell-level surfaces — sidebar/topbar, active nav pill, primary buttons, landing/login hero — so identity stays visible.
  - **Universal semantic states (never tenant-branded):** Success = green `--success` (`#00A77C`), Warning = amber `--warning` (`#F59E0B`), Danger / Failed = red `--danger` (`#DC2626`), Info = blue `--info` (`#3B82F6`). Use only for state meaning (status pills, banners, toasts, alerts) — a red-branded tenant must still show green success and red failure.
  - **Gold** (`--gold`, `#C69B26`): reserved for recognition moments (leaderboard, ranks, awards) only.
  - **Eco accent (universal):** `--eco` (`#4E7A61`, muted forest) is reserved for recycling & recovery meaning (recovered volume, recyclable value, waste collection) — never for generic decoration or states.
  - **Content ramp (identity → recognition):** multi-card rows may bridge the accent to gold with `--ramp-1..4` (accent → terracotta → amber → gold, derived in CSS from `--accent`/`--gold`). Each card still wears exactly one shade; use `--ramp-N-strong` for text.
- **TYPOGRAPHY & FONT FAMILY SPECS:**
  - **Body / Primary Font:** `DM Sans` (Fallback: `system-ui, sans-serif`) — aligned to the SMART design handoff (see `UI_POLISH_PLAN.md` D7)
  - **Heading Font:** `DM Sans` (Fallback: `system-ui, sans-serif`) — SMART uses one family for both roles
  - **Mono / Data Font:** `JetBrains Mono` (ledger, timestamps, codes)
  - **Typography Scale:**
    - `h1`: `72px` (line-height 1.1, font-weight 700)
    - `h2`: `32px` (line-height 1.25, font-weight 600)
    - `body`: `16px` (line-height 1.5)
- **SPACING & LAYOUT:**
  - **Base Unit:** `4px`
- **BRAND PERSONALITY:**
  - **Tone:** Modern
  - **Energy:** Medium
  - **Target Audience:** Environmentally conscious consumers and businesses
- **Styling Rules:** Use Tailwind CSS for all styling. Adhere strictly to these exact design tokens, the single-accent content rule, and the universal semantic state palette. Ensure responsive, accessible, and clean class usage.

## 4. 🐛 Error Handling & Debugging
- **Systematic Debugging:** Do not "random guess" or blindly change code when encountering errors.
- **Protocol:** Analyze the stack trace, review related module boundaries, and form a concrete hypothesis before applying changes.
- **Graceful Failures:** Ensure the UI handles loading and error states gracefully without breaking the user experience.

## 5. ✅ Testing & Verification
- **Verification Rule:** Never mark a task as completed without verifying the changes.
- **Checks:** Ensure code builds successfully (e.g., `npm run build`), no linting errors are introduced (`npm run lint`), and visual UI changes are manually or locally tested to confirm aesthetic standards.

## 6. 🛠️ Tech Stack Awareness
- **Frontend:** React 19 (TypeScript), Vite, TailwindCSS 4, Lucide React.
- Always utilize the latest features available in these versions.

## 7. 🗄️ Database & PostgreSQL Engineering Best Practices
- **Schema & Naming Conventions:**
  - Table names must be pluralized `snake_case` (e.g., `users`, `reports`, `waste_bins`, `offenses`, `point_histories`).
  - Foreign key columns must use `singular_table_id` (e.g., `user_id`, `reporter_id`, `assigned_mrf_id`).
  - Use database Enums for fixed categorical values (`Role`, `ReportStatus`, `WasteCategory`, `Severity`, `ReportType`).
- **Primary Keys & Security:**
  - Use non-sequential string identifiers (`UUID` or `CUID`) for primary keys to prevent enumeration security risks.
  - **Password Security:** Never store plain text passwords. Always hash passwords using `bcrypt` / `argon2` with a minimum salt rounds factor of 10.
- **Indexing & Queries:**
  - Index frequently queried foreign keys, status flags, and filter fields (`email`, `status`, `reporter_id`, `created_at`).
  - Avoid request waterfalls in API handlers; batch data fetching or use relational joins via ORM where applicable.
- **Migrations & Seeding:**
  - Never modify database schemas manually in production; always use version-controlled Prisma database migrations (`npx prisma migrate dev`).
  - Maintain idempotent database seed scripts (`seed.ts`) to populate development/testing environments safely without creating duplicate key conflicts.
- **Environment Isolation & Connection Pooling:**
  - Store database connection strings in environment variables (`DATABASE_URL`). Never commit credentials to version control.
  - Utilize connection pooling (`pgBouncer` or Prisma connection pooling) for high-concurrency production deployments.

