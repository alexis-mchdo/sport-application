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
- Planned: Recharts for stats; the free AI plugs into the weekly bilan ("Conseils de l'IA" section).
- **Base path is `/sport-application/`** (GitHub Pages project site). Keep asset paths base-relative; `vite.config.ts` holds `BASE`.
- Deployment: pushing to `main` runs `.github/workflows/deploy.yml` (lint → build → GitHub Pages). Repo is public; only code is published, never user data.
- **Dark theme only.** Design for one-handed iPhone use: respect `env(safe-area-inset-*)`, big tap targets, minimal typing (tap to validate a set, long-press for +/−).
- iOS Safari PWA limits shape the design: **no rest timer** (removed on purpose — unreliable in background), no vibration API. Data can be wiped with Safari data, so export/import JSON is a core feature.
- No AI is wired in yet. Balance warnings and load progression are deterministic rules, not AI. The owner wants a **free** AI later (likely a free-tier API such as Gemini — never a paid one); until then "Copier pour Claude" only builds a text prompt to paste into the Claude app.
