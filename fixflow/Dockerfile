# syntax=docker/dockerfile:1
# FixFlow – multi-stage build. Data (SQLite + uploads) lives in the /data volume.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/fixflow.db \
    UPLOAD_DIR=/data/uploads

# App (standalone server)
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Schema push tooling (drizzle-kit) kept separate from the slim runtime
WORKDIR /migrate
COPY --from=deps /app/node_modules ./node_modules
COPY package.json drizzle.config.ts ./
COPY src/db/schema.ts ./src/db/schema.ts

RUN mkdir -p /data && chown -R node:node /data /app /migrate
USER node
VOLUME ["/data"]
EXPOSE 3000

CMD ["sh", "-c", "cd /migrate && npx drizzle-kit push && cd /app && exec node server.js"]
