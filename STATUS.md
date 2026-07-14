# Project Status — Self Development RPG

Updated: 2026-07-14

## Current standing

**Maturity:** Working, independently reviewed alpha. The current alpha milestone is complete, but the product is not yet a release candidate.

## Implemented and verified

- Local-first, account-free character workspace
- Character profile, level, and XP
- Skills, levels, targets, status, and evidence
- Quests with now/next/later/done states, priorities, and XP
- Learning library for books, videos, courses, articles, podcasts, and other resources
- Income sources and monthly target/expense planning
- CV variants by employer, role, language, and status
- Portable AI Coach prompt generation, validated JSON preview/import, saved advice
- AI-friendly bulk JSON import with validation, count preview, atomic persistence, and normalized-name skill upserts
- Batch support for profile fields, skills, quests, knowledge notes, learning resources, income sources, CVs, advice, and money plans
- Knowledge notes displayed in the Library
- Light and dark themes
- JSON export/import/reset
- Versioned Zod validation and relational integrity checks
- Responsive desktop/mobile navigation, including mobile access to Profile/data/theme controls
- Generated PWA manifest/service worker and offline reload
- Same-origin runtime with no third-party requests

## Latest verification

- Unit/component tests: 15 passed
- TypeScript: passed
- Lint: 0 errors; 2 non-blocking Fast Refresh warnings
- Production PWA build: passed
- Chromium E2E: 13 passed
- Responsive widths: 320, 360, 390, 412, 768, and 1024 CSS px
- Persistence, heterogeneous bulk import/reload, legacy workspace migration, AI import, mobile data controls, invalid-edit protection, same-origin runtime, and offline reload verified

## Personal-data rule

Real user/profile data must never be committed into source files, fixtures, tests, screenshots, or seed data. It belongs only in the user's browser-local workspace or an explicitly user-directed private backup. The source repository must remain generic.

## Remaining product work

### High priority

- Add complete edit workflows for skills: name, category, current/target level, and evidence
- Add complete edit flows for learning records, knowledge notes, income sources, and CV variants
- Add quest notes, due dates, skill relationships, and deliberate completion undo
- Add structured master career profile and evidence/accomplishment records
- Build structured CV composition, preview, print, and PDF export
- Add selective per-item editing/acceptance for AI recommendations
- Add explicit corrupt-storage recovery UI with raw backup download, retry, import, and reset
- Add URL-backed routing, deep links, focus management, and page announcements (reload currently returns to Command)

### Persistence evolution

- Extract an asynchronous `WorkspaceRepository` port
- Keep the current localStorage adapter for small workspaces
- Add an IndexedDB adapter before storing attachments or substantially larger datasets
- Add tested sequential schema/data migrations before changing persistence version
- Preserve local/account-free operation when optional cloud sync is introduced

### Future, only when approved

- Optional accounts, recovery, and multi-device synchronization
- Native mobile wrapper and native integrations
- Hosted/direct AI connection
- Attachments and encrypted local/cloud storage
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
