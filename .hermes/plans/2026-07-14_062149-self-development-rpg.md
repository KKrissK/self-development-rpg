# Self Development RPG PWA Implementation Plan

> **For Hermes:** Implement task-by-task with strict RED → GREEN → REFACTOR and independent UX, architecture/privacy, and QA reviews.

**Goal:** Build a polished, local-first, mobile-friendly web app that turns a person's skills, work, learning, finances, CVs, and next actions into one game-like career command center.

**Architecture:** React + TypeScript PWA using feature modules over a pure domain core. A versioned repository owns browser persistence; UI consumes an `AppState` service instead of storage directly. App identity, navigation, entitlements, and AI exchange format each have explicit interfaces so branding, storage, sync, native packaging, and later monetization can change independently.

**Tech Stack:** React 19, TypeScript, Vite, React Router, Zod, Lucide, Vitest + Testing Library, Playwright, vite-plugin-pwa.

---

## Product principles

- **Useful before game-like:** levels summarize evidence and momentum; no fake currencies or manipulative streak penalties.
- **Immediate dashboard:** show the next actions, active learning, strongest/growing skills, monthly money snapshot, and current CV work before configuration.
- **Local-first and private:** no account, analytics, remote fonts, AI API, or backend in the first release. Explicit JSON export/import provides recovery and portability.
- **AI is user-directed copy/paste:** generate a bounded prompt and validate pasted JSON locally. AI text never executes code and cannot silently overwrite data.
- **One complete character is free:** data model supports profiles, but no billing or artificial lock exists in the first build.
- **Brand is a seam:** all visible name/tagline/initials and PWA metadata originate from central brand configuration.

## Information architecture

1. **Command** — character summary, level/XP, focus stats, next actions, active learning, money pulse.
2. **Skills** — skill inventory, 1–10 level, status (`learning`, `practicing`, `proven`), evidence, target level.
3. **Quests** — todos grouped as now/next/later/done with priority and optional skill linkage.
4. **Library** — books, videos, courses, articles, podcasts, and other resources with queue/in-progress/completed states.
5. **Career** — income sources, monthly plan, and CV variants by employer/role/language/status.
6. **AI Coach** — select context, copy a generated instruction + JSON schema, paste a response, preview validated recommendations, then explicitly import as quests/advice.
7. **Profile & data** — character identity, theme, export/import/reset.

## Domain boundaries

- `src/domain/model.ts` — canonical entities and `AppState`.
- `src/domain/schema.ts` — Zod validation and versioned migration boundary.
- `src/domain/actions.ts` — pure immutable state transitions.
- `src/domain/progress.ts` — derived level/XP, completion, money, and focus metrics.
- `src/platform/storage/` — repository interface plus guarded localStorage implementation.
- `src/platform/entitlements/` — capability interface; initial provider always returns false and gates no free core behavior.
- `src/config/brand.ts` — replaceable product identity.
- `src/features/*` — pages and feature-local UI.
- `src/ui/*` — reusable shell, primitives, cards, forms, empty states.

## Milestones

### 1. Foundation and test harness
- Replace generated demo, configure Vitest/Testing Library and Playwright.
- Add generated PWA manifest/service worker with local icons.
- Add scripts for test, typecheck, lint, build, E2E, and verification.
- Initialize Git and document exact run commands.

### 2. Domain tracer bullet (TDD)
- Test default character state and semantic validation.
- Test adding/completing a quest and awarding progress.
- Test skills, learning items, income sources, CVs, and AI recommendations.
- Test corrupt/unknown storage, unavailable storage acquisition, save/delete failures, export/import roundtrip.

### 3. Mobile activation and shell
- First-run character creation with a useful default workspace.
- Responsive app shell: desktop rail, mobile bottom navigation, safe-area padding, 44px+ targets.
- Light/dark themes using warm paper light surfaces and precision night surfaces with a restrained electric-lime/teal accent.

### 4. Core feature slices
- Command dashboard and progress summary.
- Skills inventory with evidence and level controls.
- Quests with status/priority/skill relationships.
- Learning library queue.
- Career workspace: income planning and CV variants.
- AI Coach: prompt generation, strict JSON validation, preview, explicit import.
- Profile/data: theme, JSON export/import, reset.

### 5. Verification and hardening
- Unit/component tests, strict TypeScript, lint, production build.
- Playwright primary journeys and reload persistence.
- Responsive checks at 320, 360, 390, 412, 768, and 1024 CSS px with no horizontal overflow.
- Keyboard/focus, axe accessibility scan, light/dark contrast inspection.
- Production PWA manifest/service worker/icon/offline checks.
- Runtime network audit: no cross-origin requests.
- Independent UX, architecture/privacy/monetization, and QA review; fix blocking findings and rerun full gate.

## MVP acceptance criteria

- A user can create a character and return after reload without data loss.
- A user can add, edit, and track skills, quests, learning resources, income sources, and CV variants.
- The dashboard derives a clear “what next” view from saved state.
- AI Coach emits a copyable prompt, rejects malformed/oversized/unsafe responses, previews valid advice, and imports only after confirmation.
- The app is usable at 320px, keyboard navigable, supports light/dark themes, installs as a PWA, and launches offline after first load.
- Data can be exported, re-imported, and deleted without an account.

## Deferred, deliberately not in the first release

Accounts/sync, collaboration, hosted AI calls, job-board integrations, bank connections, automated CV generation, native wrappers, notifications, paid plans, and multiple-profile commercial rules. Interfaces may anticipate replacement, but no dormant billing or remote activation path will ship.

## Main risks and mitigations

- **Too many modules, weak daily value:** command dashboard prioritizes next actions; secondary data lives behind focused pages.
- **Game mechanics become childish:** use restrained terminology and evidence-based progression; let labels remain replaceable.
- **Sensitive career/finance data:** remain local, validate imports, avoid runtime third parties, provide export/delete.
- **AI schema drift:** strict bounded versioned schema, human preview, no direct mutation.
- **Brand undecided:** centralized config and neutral internal slug prevent rename cost.
