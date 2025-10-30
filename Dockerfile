# syntax=docker/dockerfile:1.7

# Multi-stage production image for Next.js 15
# Build with optional public envs:
#   docker build \
#     --build-arg NEXT_PUBLIC_API_DOMAIN="http://localhost:3001" \
#     --build-arg NEXT_PUBLIC_API_BASE="http://localhost:3001" \
#     -t snook-frontend .

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Common runtime package used by some Next/Sharp binaries
RUN apk add --no-cache libc6-compat

FROM base AS deps
# Install dependencies (with lockfile for reproducible builds)
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
# Ensure a proper production build environment
ENV NODE_ENV=production

# Use previously installed deps
COPY --from=deps /app/node_modules ./node_modules

# Copy source and build
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production


# Run as non-root for security
USER node

# App runtime files
COPY --chown=node:node package.json package-lock.json ./
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
RUN npm prune --omit=dev

# Compiled app and public assets
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
# Use JS config at runtime to avoid TS dependency
COPY --from=builder --chown=node:node /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=node:node /app/postcss.config.mjs ./postcss.config.mjs

EXPOSE 5050
CMD ["npm", "run", "start"]
