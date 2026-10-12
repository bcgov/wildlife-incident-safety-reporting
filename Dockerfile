FROM oven/bun:1.4.3-alpine@sha256:629e17411f1f129dbec3af78d5af9c9f2a937435c80349437206c6b0b7422373 AS base
WORKDIR /app

FROM base AS install
WORKDIR /temp/prod
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production --ignore-scripts --omit=peer && \
    rm -rf node_modules/@types

FROM base AS builder

COPY package.json bun.lock ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY vite.config.js tsconfig.json tsconfig.base.json postcss.config.mjs ./
COPY src ./src

RUN --mount=type=cache,target=/app/node_modules/.vite \
    bun run build

FROM base

ENV NODE_ENV=production

COPY package.json bun.lock ./
COPY --link --from=install /temp/prod/node_modules ./node_modules
COPY --link --from=builder /app/dist ./dist

EXPOSE 3033

USER bun

CMD ["bun", "run", "--bun", "dist/server.js"]
