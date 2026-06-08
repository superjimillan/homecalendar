FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client .
RUN npm run build

FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 app

COPY --from=server-builder --chown=app:nodejs /app/server/dist ./server/dist
COPY --from=server-builder --chown=app:nodejs /app/server/node_modules ./node_modules
COPY --from=client-builder --chown=app:nodejs /app/client/dist ./client/dist

RUN mkdir -p /app/data /data && chown app:nodejs /app/data /data

USER app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/dist/index.js"]