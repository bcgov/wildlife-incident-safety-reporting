# Stage 1 - Base
FROM oven/bun:1.3.12-alpine AS base
WORKDIR /app

# Stage 2 - Production dependencies (cached independently)
FROM base AS install
WORKDIR /temp/prod
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production --ignore-scripts

# Stage 3 - Full install + build
FROM base AS builder

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
COPY --link --from=install /temp/prod/node_modules ./node_modules
COPY --link --from=builder /app/dist ./dist

EXPOSE 3033

USER bun

CMD ["bun", "run", "--bun", "dist/server.js"]
