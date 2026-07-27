# 🚀 SORTv2

Welcome to the SORTv2 codebase! This project is the next-generation iteration of the SORT application, designed with modern architecture, strict code quality guidelines, and premium aesthetic standards.

## 🎯 Tech Stack
- **Frontend:** React 19 (TypeScript) + Vite + TailwindCSS 4 + shadcn/ui
- **Backend:** Node.js + Express (TypeScript) + Prisma ORM (Database: PostgreSQL)
- **Linting:** oxlint

## 🏗️ Architecture Overview

The system is currently undergoing a major **UI Overhaul Phase**. During this phase:
- Network connections and real-time streaming are paused.
- The UI leverages localized mock-data abstractions or local state handlers to test structural integrity before database and network layers are reconnected.
- Detailed boundaries are maintained for Core Entities: Users (Auth, Gamification), Reports (Status workflows), WasteCollections, and Challenges.

For a full breakdown of the architecture, data models, and long-term planning, please see [`PLANNING.MD`](./PLANNING.MD).

## 📐 Agent Config & Guidelines
This repository utilizes a strict set of rules defined in `.agents/AGENTS.md`, covering:
1. **File Size Limits:** No single source code file may exceed **1,000 lines**.
2. **Code Cleanliness:** Localized state management and prevention of request waterfalls.
3. **Design Standard:** Strict adherence to brand guidelines and premium UI implementation via TailwindCSS and shadcn/ui.
4. **Debugging Protocol:** Systematic debugging over random trial and error.
5. **Testing Verification:** Mandatory local build and visual verification before tasks are marked complete.

## 🚀 Getting Started

To get up and running locally:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## 🐛 Linting
This project uses oxlint for incredibly fast linting checks.
```bash
npm run lint
```
