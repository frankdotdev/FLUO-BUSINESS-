# syntax=docker/dockerfile:1
# Three targets: build (compiles), migrate (runs database migrations), runner (the production web server).
FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json* ./
COPY packages/core/package.json packages/core/
COPY packages/adapters/package.json packages/adapters/
COPY packages/db/package.json packages/db/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
# Reproducible when package-lock.json is committed (do that after your first install); otherwise resolves fresh.
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi
COPY tsconfig.json ./
COPY packages packages
COPY apps/web apps/web
COPY database database
RUN npm run build -w @fluo/web

FROM build AS migrate
CMD ["node", "packages/db/src/migrate.ts"]

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
