# Project Status — Self Development RPG

Updated: 2026-07-14

## Current standing

**Maturity:** Working, independently reviewed alpha. The current alpha milestone is complete, but the product is not yet a release candidate.

## Implemented and verified

- Local-first, account-free character workspace
- Responsive personal-studio landing page with interactive light/dark product preview, feature story, privacy explanation, and setup transition
- Responsive personal-studio application design with floating grouped navigation, attention-first Dashboard, fluid transitions, and polished dark/light atmospheres
- Interactive Dashboard with source-page navigation, quick Goal controls, and learning-status updates
- Character profile, level, and XP
- Skills with levels, targets, status, experience, and expandable structured assessment profiles
- Complete skill editing for name, category, current/target level, status, experience, and an optional manually authored structured profile with assessment summary, demonstrated strengths, and growth areas
- Focused Now/Next/Later Goal planner with editable details, priorities, dates, skill and Library links, permanently single-claim XP, and bounded/searchable completion history
- Outcome-aware Library for books, videos, courses, articles, podcasts, and other resources, with Goal links, active-support filters, and completed-Goal impact markers
- Income sources and monthly target/expense planning
- CV variants by employer, role, language, and status, with persistent IndexedDB-backed PDF/Word/document attachments
- Portable AI Coach prompt generation, validated JSON preview/import, saved advice
- Contextual portable AI generators embedded directly in the Skills, Goals, and Library add workflows
- Progress-tracked single-skill AI assessment with a conservative 1–10 rubric, structured reasoning/experience/strengths/gaps, validated preview, and explicit import
- AI-friendly bulk JSON import with validation, count preview, atomic persistence, and normalized-name skill upserts
- Batch support for profile fields, skills, Goals (`quests` in the compatible JSON contract), knowledge notes, learning resources, income sources, CVs, advice, and money plans
- Knowledge notes displayed in the Library
- Light and dark themes
- JSON export/import plus complete workspace-and-attachment reset and a development-only wipe/restart control
- Versioned Zod validation and relational integrity checks
- Responsive desktop/mobile navigation, including mobile access to Profile/data/theme controls
- Generated PWA manifest/service worker and offline reload
- Same-origin runtime with no third-party requests

## Latest verification

- Unit/component tests: 25 passed
- TypeScript: passed
- Lint: 0 errors; 2 non-blocking Fast Refresh warnings
- Production PWA build: passed
- Chromium E2E: 20 passed
- Responsive widths: 320, 360, 390, 412, 768, and 1024 CSS px
- Persistence, Goal XP exploit prevention, Goal-to-Library linking/completion reflection, bounded completion history, real CV upload/reload/download/reset, heterogeneous bulk import/reload, legacy workspace migration, AI import, mobile data controls, invalid-edit protection, same-origin runtime, and offline reload verified

## Personal-data rule

Real user/profile data must never be committed into source files, fixtures, tests, screenshots, or seed data. It belongs only in the user's browser-local workspace or an explicitly user-directed private backup. The source repository must remain generic.

## Remaining product work

### High priority

- Add complete edit flows for learning records, knowledge notes, income sources, and CV variants
- Add structured master career profile and evidence/accomplishment records
- Build structured CV composition, preview, print, and PDF export
- Add selective per-item editing/acceptance for AI recommendations
- Add explicit corrupt-storage recovery UI with raw backup download, retry, import, and reset
- Add URL-backed routing, deep links, focus management, and page announcements (reload currently returns to Dashboard)

### Persistence evolution

- Extract an asynchronous `WorkspaceRepository` port
- Keep the current localStorage adapter for small workspaces
- Keep CV binary storage behind the asynchronous attachment repository so IndexedDB can later be replaced by cloud object storage
- Add ZIP backup/restore for workspace metadata plus attached CV file contents
- Add tested sequential schema/data migrations before changing persistence version
- Preserve local/account-free operation when optional cloud sync is introduced

### Future, only when approved

- Optional accounts, recovery, and multi-device synchronization
- Native mobile wrapper and native integrations
- Hosted/direct AI connection
- Encrypted cloud storage and local-to-cloud attachment migration
- Typed fail-closed entitlement provider and separately reviewed monetization implementation

### Release work

- Final product name and single-source branding generation
- Deployment security headers (CSP, Referrer-Policy, X-Content-Type-Options, Permissions-Policy)
- Full accessibility scan across populated feature pages
- Real-user validation and usability iteration
- HTTPS deployment, privacy/legal copy, operational monitoring, and release checklist

## Location and run instructions

Project:

`C:\Users\Kriss\Desktop\Project Hermes\products\self-development-rpg`

Development:

```bash
npm install
npm run dev
```

Production preview:

```bash
npm run build
npm run preview
```

Complete verification:

```bash
npm run test && npm run lint && npm run typecheck && npm run build && npm run e2e
```
