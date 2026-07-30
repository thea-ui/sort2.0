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
  - **Main Text / Headings (Primary):** `#00271D` (Rich evergreen)
  - **Accent / Buttons / Links (Action):** `#00A77C` (Luminous vibrant teal-green)
  - **Secondary / Badges / Ranks (Gold Accent):** `#C69B26` (Saturated green-gold)
  - **Text Primary:** `#00271D` (or `#00A77C` for links/accents)
  - **Surface / Cards:** Crisp white with clean modern borders (`border border-white/80` or `border-[#00271D]/10`).
  - **2026 Border Radius System:**
    - Navigation Capsule & Active Tabs: `rounded-full`
    - Hero Cards & Main Containers: `rounded-3xl` (`24px`)
    - Content Cards & Modules: `rounded-2xl` (`16px` / `20px`)
    - Buttons, Badges & Inputs: `rounded-xl` (`12px`) or `rounded-full`
- **VIBRANT MULTI-COLOR INDICATOR SYSTEM:**
  - **Action Triggers / Report:** Vibrant Red-Orange (`#FF5722` / `from-orange-500 to-rose-500`)
  - **Bin Map / Facilities:** Vibrant Sky-Blue (`#0091EA` / `from-sky-400 to-blue-600`)
  - **Activity / Programs:** Vibrant Violet-Purple (`#651FFF` / `from-purple-500 to-indigo-600`)
  - **Leaderboard / Achievements / Points:** Vibrant Amber-Gold (`#FFAB00` / `from-amber-400 to-orange-500`)
  - **Impact / Trees / Recycled:** Vibrant Emerald Green (`#10B981`)
  - **Events:** Vibrant Rose-Pink (`#EC4899`)
  - **Research:** Vibrant Electric Cyan (`#06B6D4`)
- **TYPOGRAPHY & FONT FAMILY SPECS:**
  - **Body / Primary Font:** `Tenon` (Fallback: `'Plus Jakarta Sans', sans-serif`)
  - **Heading Font:** `Korolev` (Fallback: `'Plus Jakarta Sans', sans-serif`)
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
- **Styling Rules:** Use Tailwind CSS for all styling. Adhere strictly to these exact design tokens and vibrant color indicators. Ensure responsive, accessible, and clean class usage.

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

