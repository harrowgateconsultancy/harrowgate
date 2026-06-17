##############################################
# Stage 1 — install dependencies
##############################################
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Copy all package.json files so pnpm can resolve the workspace graph
COPY lib/db/package.json            lib/db/
COPY lib/api-spec/package.json      lib/api-spec/
COPY lib/api-zod/package.json       lib/api-zod/
COPY lib/integrations/package.json  lib/integrations/
COPY lib/integrations-openai-ai-server/package.json lib/integrations-openai-ai-server/
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/harrowgate/package.json artifacts/harrowgate/

RUN pnpm install --no-frozen-lockfile

##############################################
# Stage 2 — build frontend (React/Vite)
##############################################
FROM deps AS frontend-builder

COPY lib/       lib/
COPY artifacts/harrowgate/ artifacts/harrowgate/
COPY attached_assets/      attached_assets/

ARG BASE_PATH=/

ENV PORT=3000
ENV BASE_PATH=${BASE_PATH}
ENV NODE_ENV=production

RUN pnpm --filter @workspace/harrowgate run build

##############################################
# Stage 3 — build API server
##############################################
FROM deps AS api-builder

COPY lib/               lib/
COPY artifacts/api-server/ artifacts/api-server/
COPY scripts/              scripts/

ENV NODE_ENV=production

RUN pnpm --filter @workspace/api-server run build

##############################################
# Stage 4 — nginx: serve frontend + proxy API
##############################################
FROM nginx:alpine AS frontend

COPY --from=frontend-builder /app/artifacts/harrowgate/dist/public /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

##############################################
# Stage 5 — API server runtime
##############################################
FROM node:20-alpine AS api

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=api-builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=api-builder /app/node_modules              ./node_modules
COPY --from=api-builder /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
