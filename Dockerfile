FROM oven/bun:1.4.2-alpine@sha256:d888c0ae6c86d7866ff10c5aafdd9077b36aee6455b33dd270fb93c0dd5cef6f AS base
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
