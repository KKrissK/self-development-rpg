# Untitled — Self Development RPG

A local-first, mobile-friendly PWA for managing your character, skills, Goals, learning Library, income plan, CV variants, and portable AI coaching workflow.

First-time visitors enter through a responsive product landing page with code-native previews of the Dashboard, connected Goals and Library, structured Skills, the portable AI workflow, and local-first privacy model. Creating a workspace continues into character setup; browsers with an existing workspace still open directly to the Dashboard.

Goals use focused Now/Next/Later planning lanes, editable details, linked Library support, one-time XP rewards, and a paged completion history so finished work does not create an endless board column.

The Dashboard links every summary to its source page and supports quick Goal creation/completion/planning plus learning-status updates in place.

The product name is deliberately provisional. Update `src/config/brand.ts`, PWA metadata in `vite.config.ts`, and the fallback title in `index.html` when a final name is selected.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`).

## Production preview

```bash
npm run build
npm run preview
```

## Verification

```bash
npm run test
npm run typecheck
npm run lint
npm run build
npm run e2e
```

## Privacy and storage

- No account, backend, analytics, remote font, direct AI API, or billing package.
- Workspace metadata is validated and stored in one versioned browser-local record; CV documents are stored as original file blobs in IndexedDB.
- The CV Vault accepts PDF, DOC, DOCX, ODT, RTF, and TXT files up to 20 MB, with download, replace, and delete controls.
- A full reset also erases locally stored CV files. JSON exports currently contain metadata, not the attached file contents.
- Profile → Your data provides JSON export, validated import, and reset.
- Skills, Goals, and Library each provide focused copy/paste AI add methods that validate returned JSON and preview every item before explicit import.
- Its single-skill assessment prompt guides any AI through a progress-tracked interview and conservative 1–10 capability estimate, then stores the reasoning, experience, demonstrated strengths, and growth areas separately.
- AI Coach creates a copy/paste coaching prompt for any AI and validates the returned JSON before explicit import.

## Current maturity

Alpha. The major local workflows are implemented; public release still requires deeper migration coverage, selective AI import editing, CV document composition/export, external accessibility review, deployment, and real-user validation.
