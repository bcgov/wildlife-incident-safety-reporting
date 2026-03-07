# Stage 1 - Base
FROM oven/bun:1.3.10-alpine AS base
WORKDIR /app

# Stage 2 - Production dependencies (cached independently)
FROM base AS install
COPY package.json bun.lock ./
RUN mkdir -p /temp/prod && \
    cp package.json bun.lock /temp/prod/ && \
    cd /temp/prod && \
    bun install --frozen-lockfile --production --ignore-scripts

# Stage 3 - Full install + build
FROM base AS builder

# VITE_ vars are baked into the client bundle at build time.
# Pass via --build-arg or CI secrets. Server env vars are injected at runtime.
# Required: VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM, VITE_KEYCLOAK_CLIENT_ID
# Optional: VITE_GOOGLE_MAPS_API_KEY
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID
ARG VITE_GOOGLE_MAPS_API_KEY

COPY package.json bun.lock ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY vite.config.js tsconfig.json ./
COPY src ./src

RUN --mount=type=cache,target=/app/node_modules/.vite \
    bun run build

# Stage 4 - Runtime
FROM base

ENV NODE_ENV=production

COPY package.json bun.lock ./
COPY --from=install /temp/prod/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3033

USER bun

CMD ["bun", "run", "--bun", "dist/server.js"]
