# Untitled — Self Development RPG

A local-first, mobile-friendly PWA for managing your character, skills, quests, learning queue, income plan, CV variants, and portable AI coaching workflow.

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
- Workspace data is validated and stored in one versioned browser-local record.
- Profile → Your data provides JSON export, validated import, and reset.
- AI Coach creates a copy/paste prompt for any AI and validates the returned JSON before explicit import.

## Current maturity

Alpha. The major local workflows are implemented; public release still requires deeper migration coverage, selective AI import editing, CV document composition/export, external accessibility review, deployment, and real-user validation.
