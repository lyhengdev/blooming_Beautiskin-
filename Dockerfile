# syntax=docker/dockerfile:1
# Blooming Beauty Skin — API (Express + Prisma + Puppeteer invoice rendering)
# Built as part of the pnpm monorepo. Targets the `api` workspace only.

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
RUN npm install -g pnpm@9.0.0

WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
RUN pnpm fetch

COPY . .
RUN pnpm install --offline --frozen-lockfile

# Generate the Prisma client from the schema
WORKDIR /app/apps/api
RUN pnpm db:generate

# Compile the API to dist/
RUN pnpm --filter=api build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

# Chromium + the shared libraries Puppeteer needs to run headless Chrome.
# We use the distro Chromium binary instead of Puppeteer's bundled download.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Keep Puppeteer from re-downloading its own Chrome in the image
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Copy production node_modules (workspace-linked) + compiled output
RUN mkdir -p /app/node_modules /app/apps/api /app/assets
COPY --from=builder /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api

# Regenerate the Prisma client for the actual runtime platform so the
# query engine binary matches this Linux image (dev builds are macOS).
WORKDIR /app/apps/api
RUN npx prisma generate
WORKDIR /app

# Brand logo used on the invoice receipt (optional; skipped if absent)
COPY --from=builder /app/apps/web/public/logo.png /app/assets/logo.png
ENV LOGO_PATH=/app/assets/logo.png

# Invoke the compiled entrypoint
CMD ["node", "apps/api/dist/index.js"]
