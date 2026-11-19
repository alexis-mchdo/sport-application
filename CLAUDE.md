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
npm run icons    # regenerate favicon / PWA / apple-touch icons from public/logo.svg
```

## Architecture & constraints

- Vite + React 19 + TypeScript, Tailwind CSS v4 (via `@tailwindcss/vite`, theme tokens defined with `@theme` in `src/index.css`), `vite-plugin-pwa` (auto-update service worker, manifest in `vite.config.ts`).
- Planned (per spec): Dexie for IndexedDB, Recharts for stats, Vitest for the pure algorithms (muscle balance, progression).
- **Base path is `/sport-application/`** (GitHub Pages project site). Keep asset paths base-relative; `vite.config.ts` holds `BASE`.
- Deployment: pushing to `main` runs `.github/workflows/deploy.yml` (lint → build → GitHub Pages). Repo is public; only code is published, never user data.
- **Dark theme only.** Design for one-handed iPhone use: respect `env(safe-area-inset-*)`, big tap targets, minimal typing (tap to validate a set, long-press for +/−).
- iOS Safari PWA limits shape the design: **no rest timer** (removed on purpose — unreliable in background), no vibration API. Data can be wiped with Safari data, so export/import JSON is a core feature.
- AI is out of scope in-app for now: the "Copier pour Claude" feature only builds a text prompt for the user to paste into the Claude app. Balance warnings and load progression are deterministic rules, not AI.
