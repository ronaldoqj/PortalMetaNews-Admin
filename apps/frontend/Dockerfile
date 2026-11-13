# The frontend's production image (build context: apps/frontend). Node is pinned to the repository's version (.nvmrc),
# the build's dependencies stay in the build stage, and every setting reaches the container only when it runs: the
# server reads its configuration (SITE_DOMAIN, BACKEND_INTERNAL_URL...) at request time, never from the build.

FROM node:24.20.0-alpine AS build
WORKDIR /app
# Next.js's anonymous usage telemetry stays off, as every other kind of tracking.
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-update-notifier --no-fund --no-audit
COPY next.config.ts tsconfig.json tsconfig.build.json ./
COPY messages ./messages
COPY content ./content
COPY public ./public
COPY src ./src
RUN npm run build --no-update-notifier && rm -rf .next/cache && npm prune --omit=dev --no-update-notifier --no-fund

FROM node:24.20.0-alpine
# tini runs as PID 1, so the stop signal of a redeploy reaches Node and the server ends at once.
RUN apk add --no-cache tini
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
WORKDIR /app
COPY --from=build /app/package.json /app/next.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
# The panel's documentation is read from disk when a page opens.
COPY --from=build /app/content ./content
# The server writes its image and page caches under .next at runtime.
COPY --from=build --chown=node:node /app/.next ./.next
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
# Started by Node itself, not through npm: no npm process in between, no npm warnings in the logs.
CMD ["node", "node_modules/next/dist/bin/next", "start"]
