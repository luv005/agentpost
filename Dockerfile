# ── Build Stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Production Stage ─────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install drizzle-kit

COPY --from=build /app/dist ./dist
COPY src/db/migrations ./src/db/migrations
COPY drizzle.config.ts ./
COPY public/ ./public/
COPY docs/ ./docs/
COPY start.sh ./

EXPOSE 3000
EXPOSE 2525

CMD ["sh", "start.sh"]
