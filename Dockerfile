FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm run build:migration && \
    # Remove glibc sharp binaries (Alpine uses musl)
    rm -rf .next/standalone/node_modules/@img/sharp-linux-x64 \
           .next/standalone/node_modules/@img/sharp-libvips-linux-x64 && \
    # Remove dev dependencies leaked into standalone
    rm -rf .next/standalone/node_modules/typescript && \
    # Remove source maps
    find .next/standalone -name "*.map" -delete 2>/dev/null || true

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN apk add --no-cache tini && rm -rf /var/cache/apk/*
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/migrate.js ./
# Remove files copied by standalone that aren't needed at runtime
RUN rm -f Dockerfile docker-compose.yml components.json drizzle.config.ts \
         tsconfig.json postcss.config.mjs package-lock.json README.md && \
    mkdir -p /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO- http://localhost:3000/api/v1/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node migrate.js && node server.js"]
