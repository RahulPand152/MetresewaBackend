# syntax=docker/dockerfile:1

# ── Base stage ────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# ── Dependencies stage ────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── Build stage ───────────────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npx tsc --outDir dist

# ── Final (production) stage ──────────────────────────────────────────
FROM base AS final

ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma

EXPOSE 5000

CMD ["node", "dist/index.js"]
