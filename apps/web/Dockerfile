# syntax=docker/dockerfile:1
# Blooming Beauty Skin — Web frontend (Next.js 14 app router)
# Built as part of the pnpm monorepo. Targets the `web` workspace only.

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
RUN npm install -g pnpm@9.0.0

WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
RUN pnpm fetch

COPY . .
RUN pnpm install --offline --frozen-lockfile

# API base URL for the frontend, baked into the Next build.
# Override at deploy time with a build ARG (Render env var works too).
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Compile the web app to .next/
RUN pnpm --filter=web build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime
ENV NODE_ENV=production

WORKDIR /app

# Copy the workspace config + production node_modules
RUN mkdir -p /app/apps
COPY --from=builder /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web

WORKDIR /app/apps/web

EXPOSE 3000
# .bin/next is a shell wrapper — execute it directly (do not prefix with node)
CMD ["sh", "-c", "node_modules/.bin/next start -p 3000"]