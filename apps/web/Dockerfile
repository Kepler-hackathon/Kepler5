# Context: monorepo root (CDK sets context to repo root, file: apps/web/Dockerfile).
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm install --frozen-lockfile && pnpm --filter @kepler/web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
# outputFileTracingRoot=monorepo-root means standalone mirrors the full path:
#   server.js lives at apps/web/server.js inside the standalone dir.
COPY --from=build --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /app/apps/web/public ./apps/web/public
COPY --from=build --chown=app:app /app/apps/web/migrate.js ./apps/web/migrate.js
USER app
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
