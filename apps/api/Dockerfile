# ---- Stage 1: Builder ----
FROM node:22-alpine AS builder
WORKDIR /app

# Copy root monorepo files
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install ALL dependencies (including dev) for build
RUN npm ci

# Build shared package
RUN npm run build:shared

# Generate Prisma Client & Build NestJS
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# ---- Stage 2: Production ----
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts & production dependencies
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Install only production dependencies at root (for shared)
RUN npm ci --omit=dev

# Install production dependencies for api
WORKDIR /app/apps/api
RUN npm ci --omit=dev

# Expose port (Render sets PORT env)
EXPOSE 10000

# Start NestJS
CMD ["node", "dist/main"]