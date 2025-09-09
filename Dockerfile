# syntax=docker/dockerfile:1

############################
# deps: prod + dev (нужен typescript для next.config.ts)
############################
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev

############################
# build: сборка Next в standalone
############################
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# переносим зависимости и код
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# клиентские переменные на этапе сборки
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# билд
RUN npm run build

############################
# runtime: минимальный образ со сборкой
############################
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=80 \
    HOSTNAME=0.0.0.0 \
    HOST=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# public и standalone-вывод next
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 80
CMD ["node", "server.js"]
