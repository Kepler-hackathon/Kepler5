# KeplerLearn

Course-centric learning platform (hackathon build). Product and design docs live in the `docs/` submodule; the backend architecture is [`docs/backend-plan.md`](docs/backend-plan.md).

## Layout

```
apps/web            Next.js app (UI + /api route handlers) — minimal scaffold, see backend-plan §13
workers/generator   Node Lambda: on-demand generation jobs + Step Functions tasks (stub)
workers/deck-parser Python Lambda container: PPTX/PDF → slides + text (stub, image verified)
infra/              AWS CDK (TypeScript) — the whole environment, see infra/README.md
docs/               Submodule: PRD, screens, design plan, backend plan
```

Each package is standalone (`npm install` inside it). Nothing shares a lockfile.

## Deploying

See [`infra/README.md`](infra/README.md).
