# syntax=docker/dockerfile:1

# --- deps ---------------------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder ------------------------------------------------------------
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next.config.ts sets output: 'standalone', which emits a self-contained
# server bundle with only the traced dependencies.
RUN npm run build

# --- runner -------------------------------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# Standalone output already contains server.js and the traced node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# sharp comes in with the traced standalone output, but npm installs every
# platform variant. On alpine only the musl build is reachable, so the glibc
# and wasm copies are dead weight (~27 MB). The globs do not match
# "linuxmusl-*", which is the one we keep.
RUN rm -rf node_modules/@img/sharp-wasm32 \
 && find node_modules/@img -maxdepth 1 -name 'sharp-libvips-linux-*' -exec rm -rf {} + \
 && find node_modules/@img -maxdepth 1 -name 'sharp-linux-*' -exec rm -rf {} +

# drizzle-orm is bundled into the Next server chunks, so tracing leaves no copy
# in node_modules — but scripts/migrate.mjs runs outside that bundle and needs
# the real package.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm

# Committed migrations and the runner that applies them.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --chown=nextjs:nodejs scripts/migrate.mjs ./scripts/migrate.mjs
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh

# Owned by the app user so a fresh named volume inherits that ownership —
# the container does not run as root and could not chown it later.
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
