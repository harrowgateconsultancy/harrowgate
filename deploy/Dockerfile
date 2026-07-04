# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build (Debian-based — Alpine/musl is excluded by workspace overrides)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20 AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all source packages
COPY lib/              ./lib/
COPY artifacts/harrowgate/  ./artifacts/harrowgate/
COPY artifacts/api-server/  ./artifacts/api-server/
COPY scripts/          ./scripts/

# attached_assets is referenced by the @assets vite alias
COPY attached_assets/  ./attached_assets/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# ── Build the React frontend ──────────────────────────────────────────────────
# BASE_PATH=/ means the app is served at the root of the domain (e.g. https://your-nas.com/)
# PORT is required by vite.config.ts (any valid number works for the build step)
ENV NODE_ENV=production
ENV BASE_PATH=/
ENV PORT=3001
RUN pnpm --filter @workspace/harrowgate run build

# ── Build the Express API server (esbuild → single dist/index.mjs bundle) ────
RUN pnpm --filter @workspace/api-server run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Production runtime (Alpine for smaller image size)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy only the built bundles — no source code or node_modules at runtime
COPY --from=builder /app/artifacts/api-server/dist      ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/harrowgate/dist/public  ./artifacts/harrowgate/dist/public

EXPOSE 3000

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
