# The API's production image (build context: apps/backend). Node is the repository's version (.nvmrc); the build's
# dependencies stay in the build stage, and every setting and secret reaches the container only when it runs.

FROM node:24.20.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-update-notifier --no-fund --no-audit
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build --no-update-notifier && npm prune --omit=dev --no-update-notifier --no-fund

FROM node:24.20.0-alpine
# tini is PID 1, so the stop signal of a redeploy reaches Node.
RUN apk add --no-cache tini
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Files kept on the local disk (STORAGE_DRIVER=local) live here: mount a persistent volume on it.
RUN mkdir -p /app/storage && chown node:node /app/storage
USER node
# Liveness only (no database); readiness is /health/ready. The start period covers the migrations.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
# The same as `npm run start:prod`: pending migrations first, and the API only if they succeed.
CMD ["sh", "-c", "node dist/common/database/migrate.js && exec node dist/main"]
