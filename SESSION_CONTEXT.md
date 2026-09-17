# Session Context — KeplerLearn Hackathon Project

_Last updated: 2026-09-17_

---

## Project Overview

**KeplerLearn** — an AI-powered LMS (Learning Management System) for university courses.
- Stack: Next.js 15 App Router (TypeScript, Tailwind), PostgreSQL, AWS S3 + Bedrock
- Monorepo: `apps/web`, `workers/deck-parser`, `packages/*`
- Dev server: `http://localhost:3000` (run from `apps/web/`)
- AWS Bedrock model: **`us.anthropic.claude-sonnet-4-6`** (only model that works on this account)

---

## What Was Built (This Session + Prior Session)

### Slide Image Rendering Pipeline (COMPLETE)
- `workers/deck-parser/handler.py` — `_rasterize_deck()` renders each PDF page as 2× PNG via PyMuPDF, uploads to `ASSETS_BUCKET` S3
- `apps/web/src/components/slide-viewer/slide-stage.tsx` — `ASSETS_BASE = NEXT_PUBLIC_ASSETS_CDN_URL || "/api/assets"`, renders `<img>` when `imageKey` present, text fallback otherwise
- `apps/web/src/app/api/assets/[...key]/route.ts` — S3 proxy for local dev (serves ASSETS_BUCKET objects at `/api/assets/…`)
- `.env.example` + `apps/web/.env.local` — `NEXT_PUBLIC_ASSETS_CDN_URL=` documented (empty = use proxy)

### Playwright E2E Tests (12/12 PASSING)
- `apps/web/playwright.config.ts` — Chromium only, `baseURL: http://localhost:3000`
- `apps/web/e2e/helpers.ts` — `seedIdentity()` sets localStorage for demo user
- `apps/web/e2e/flow.spec.ts` — 12 tests covering role selector, course/module/lecture navigation, slide image rendering, forum, assistant, quizzes, progress, API health

### Seed Script
- `scripts/seed-and-parse.mjs` — full pipeline: creates course/module, uploads PDFs to S3, runs deck-parser locally
- Run: `node --env-file=apps/web/.env.local scripts/seed-and-parse.mjs`

---

## Current DB State (after last wipe + seed)

| Entity | ID |
|--------|----|
| Course | `60e0d45e-f599-4ced-911e-f81f8caa59e4` |
| Module | `90e327e5-e8ce-4443-834d-146f03195a46` |
| Lecture L01 | `a54fe713-9c31-47b0-bdb8-651e9ad5019e` (44 slides, all with imageKey) |
| Lecture L02 | `2b025334-471a-4b16-a2d4-bc8199fa3611` (47 slides, all with imageKey) |
| Demo User | `550e8400-e29b-41d4-a716-446655440000` |

- Slides served at: `/api/assets/slides/{lectureId}/{index}.png`
- Browse: `http://localhost:3000/course/60e0d45e-f599-4ced-911e-f81f8caa59e4`

---

## Identity / Auth Pattern

- No real auth — demo identity via localStorage:
  - `keplerlearn:user-id` = UUID
  - `keplerlearn:last-role` = `"student"` or `"teacher"`
- Middleware reads `x-kepler-user` + `x-kepler-role` headers (set by client from localStorage)
- Playwright seeds identity via `page.evaluate()` before each test

---

## Pending Tasks (not yet done)

### Screen 7 — "Questions Asked" sub-tab in Progress Hub
- Students can't see FAQ threads they posted in the progress page
- Sub-tab exists but queries may be wrong or missing

### Screen 9 — Teacher Analytics
- Slide heatmap: 32-thumbnail matrix, green/yellow/red coding
- AI recommendations callout
- Neither implemented yet

### Screen 2 — FAQ / Forum improvements
- Two-column layout with 300px left filter panel
- Slide thumbnail preview grid in compose dialog

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/components/slide-viewer/slide-stage.tsx` | Slide image/text renderer |
| `apps/web/src/app/api/assets/[...key]/route.ts` | S3 proxy for local dev |
| `workers/deck-parser/handler.py` | PDF→PNG rasterization + S3 upload |
| `apps/web/e2e/flow.spec.ts` | Playwright e2e tests |
| `apps/web/e2e/helpers.ts` | Test helpers (seedIdentity, IDs) |
| `scripts/seed-and-parse.mjs` | DB wipe + re-seed + parse script |
| `apps/web/.env.local` | Local env vars (not committed) |

---

## Useful Commands

```bash
# Dev server (from repo root)
cd apps/web && pnpm dev

# Run Playwright tests (server must be running)
cd apps/web && pnpm e2e

# Re-seed DB from scratch
node --env-file=apps/web/.env.local scripts/seed-and-parse.mjs

# TypeCheck
cd apps/web && pnpm typecheck

# Last commit
# 0aeba54 test: verify slide image rendering end-to-end with seed script
```

---

## AWS / Infrastructure Notes

- `UPLOADS_BUCKET` — PDF uploads
- `ASSETS_BUCKET` — rasterized PNG slides
- `NEXT_PUBLIC_ASSETS_CDN_URL` — CloudFront URL for prod; empty in local dev (uses `/api/assets` proxy)
- Bedrock: `us.anthropic.claude-sonnet-4-6` is the **only** working model on this account
- `getBedrock()` needs `credentialProvider: defaultProvider()` for local dev

---

## Recent Git Commits

```
0aeba54 test: verify slide image rendering end-to-end with seed script
83a73ff test: add Playwright e2e suite covering main user flows
0fcb568 feat: slide image rendering — rasterize PDF/PPTX pages to S3, serve via CDN/proxy
3624441 fix: wire backend to course progress, quiz module param, Stage C widget, chat scope selector, FAQ question count
8ff234f fix: Screen 10 review queue — 35/65 workbench layout, dark-navy widget sandbox, sticky action bar
```
