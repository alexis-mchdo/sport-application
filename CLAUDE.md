# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal strength-training app ("Muscu") for a single user on iPhone. It is a **PWA** (installed to the iOS home screen via Safari), not a native app — the owner refuses any paid service (no Apple developer account, no paid APIs). All data lives **on-device** (IndexedDB); there is no backend.

The full product spec, in French, is [docs/CONCEPTION.md](docs/CONCEPTION.md) — read it before implementing features. It defines the screens, data model, muscle-balance algorithm, weekly progression rules and the build steps (§9). The owner validates design choices before code is written; discuss significant deviations with them first. Communicate with the owner in **French**; UI text is French.

## Commands

```bash
npm run dev      # dev server (http://localhost:5173/sport-application/)
npm run build    # type-check (tsc -b) + production build into dist/
npm run lint     # oxlint
npm test         # vitest (all tests)
npx vitest run src/rappel.test.ts   # a single test file
GEMINI_API_KEY=… npm run eval:ia   # live AI scenarios (skipped without key) → scripts/eval-ia-rapport-normale.md (burns free daily quota)
npm run icons    # regenerate favicon / PWA / apple-touch icons from public/logo.svg
```

## Architecture & constraints

- Vite + React 19 + TypeScript, Tailwind CSS v4 (via `@tailwindcss/vite`, theme tokens defined with `@theme` in `src/index.css`), `vite-plugin-pwa` (auto-update service worker, manifest in `vite.config.ts`).
- Data: Dexie over IndexedDB (`src/db.ts`), read reactively in screens with `useLiveQuery`. Types follow the spec model in `src/types.ts`. Settings are key/value rows (`lireReglages` / `ecrireReglage`).
- Exercise library is code, not data: `src/data/bibliotheque.ts` is re-`bulkPut` into the DB on every start (`synchroniserBibliotheque`). **Never rename a built-in exercise id** — programmes and history reference them. User-created exercises have `perso: true` and ids prefixed `perso-`; only those are editable and only those are exported.
- Backup (`src/sauvegarde.ts`): versioned JSON (`VERSION_SAUVEGARDE`); export goes through the iOS share sheet; import replaces all tables. When changing the data model, bump the version and handle older files on import.
- Navigation is plain React state (tabs in `App.tsx`, sub-screens held by the parent screen) — no router. Screens live in `src/ecrans/`, shared UI primitives in `src/composants/ui.tsx`.
- Business rules are pure functions in `src/logique/` with Vitest tests next to them: `equilibre.ts` (weekly sets per muscle, targets in `CIBLES`, ordered alerts + exercise suggestions) and `programme.ts` (default prescription, which session receives a suggested exercise). DB writes for programmes go through `src/actionsProgramme.ts` (`modifierProgramme` / `modifierSeance` mutate inside a transaction; only one programme is `actif`).
- Programme templates live in `src/data/modeles.ts`. The test suite enforces that every template only uses library ids, has no red alert / push-pull imbalance, and that 4+ day templates produce no alert at all — re-run `npm test` after touching templates or `CIBLES`.
- Workouts: a `SeanceRealisee` with `enCours: true` is the in-progress session (only one at a time; `src/actionsSeance.ts`). Every tap writes to the DB immediately so iOS killing the PWA loses nothing. Each `Serie` keeps planned vs actual reps/weight; `statutSerie` (in `src/logique/seance.ts`) derives success/failure — the weekly progression (spec §7) will rely on it. Today's session choice is `seanceDuJour` (fixed weekday vs programme order).
- **Training week ≠ calendar week**: `reglages.semaine = { numero, debut }` is a numbered cycle the user closes manually from the weekly bilan (`ecrans/BilanSemaine.tsx` → `cloturerSemaine` in `actionsSeance.ts`, which applies accepted load changes to the programme, stores a `BilanSemaine`, and opens week N+1). Every `SeanceRealisee` carries `semaine`; sessions of the current week stay editable (`SeanceEnCours` with `modeEdition`), closed weeks are read-only. Load-change rules live in `logique/progression.ts`. `migrerDonnees()` (run at start and after import) backfills `semaine` on old data.
- Profile (spec §10) is stored as the `profil` row of the `reglages` table (`lireProfil` / `modifierProfil`), so it is exported with backups. `profilEnTexte` builds the text that the future AI will receive. The AI (spec §11) must return structured proposals the user accepts/refuses — it is explicitly **not a chatbot**.
- Stats (`ecrans/Stats.tsx`, computations in `logique/stats.ts`) use hand-written SVG/HTML charts in `composants/graphiques/` — no chart library. Chart colors are theme tokens in `src/index.css` (`--color-serie` for marks, `--color-chaleur-1…6` sequential ramp) validated for the dark card surface with the dataviz palette validator; the brand accent `#a3e635` is too light for chart marks (fails the lightness band), keep it for UI only.
- **Base path is `/sport-application/`** (GitHub Pages project site). Keep asset paths base-relative; `vite.config.ts` holds `BASE`.
- Deployment: pushing to `main` runs `.github/workflows/deploy.yml` (lint → build → GitHub Pages). Repo is public; only code is published, never user data.
- **Dark theme only.** Design for one-handed iPhone use: respect `env(safe-area-inset-*)`, big tap targets, minimal typing (tap to validate a set, long-press for +/−).
- iOS Safari PWA limits shape the design: **no rest timer** (removed on purpose — unreliable in background), no vibration API. Data can be wiped with Safari data, so export/import JSON is a core feature.
- AI = Gemini free tier, called straight from the browser (`src/ia/gemini.ts`, REST `v1beta/models/{model}:generateContent`, JSON schema output). Free Flash models are often saturated (503) and daily quotas are tiny (429): app calls go through `appelerGeminiAvecSecours`, which tries the chosen model once then falls back to `MODELE_SECOURS` (`gemini-flash-lite-latest`). The owner refuses any paid service. Prompts, schemas and — most importantly — the safety validation of every AI answer live in `src/logique/ia.ts` (`verifierAnalyse`, `verifierProgrammeIA`): never apply AI output without going through them. The API key is the `cleIA` row of `reglages`, listed in `CLES_LOCALES` so backups never export it. Weekly analysis is cached in the `analyseIA` row until the week is closed; accepted/refused descriptions are stored on the `BilanSemaine` and fed back to the AI. Balance warnings and rule-based load progression stay deterministic (not AI).
