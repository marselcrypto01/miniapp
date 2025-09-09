# --- deps: ставим prod + dev (нужен typescript для next.config.ts) ---
    FROM node:20-alpine AS deps
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci --include=dev
    
    # --- build: собираем Next в standalone-режиме ---
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # переносим зависимости
    COPY --from=deps /app/node_modules ./node_modules
    # копируем весь проект
    COPY . .
    
    # прокидываем клиентские переменные на этапе сборки
    ARG NEXT_PUBLIC_SUPABASE_URL
    ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
    ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
    ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    
    # (опционально) отключаем телеметрию
    ENV NEXT_TELEMETRY_DISABLED=1
    
    # билд
    RUN npm run build
    
    # --- runtime: минимальный рантайм только с собранным сервером ---
    FROM node:20-alpine AS runner
    WORKDIR /app
    
    ENV NODE_ENV=production
    # таймвеб обычно прокидывает свой PORT; по умолчанию 3000
    ENV PORT=3000
    ENV HOST=0.0.0.0
    ENV NEXT_TELEMETRY_DISABLED=1
    
    # public и standalone-вывод next
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/.next/standalone ./
    COPY --from=builder /app/.next/static ./.next/static
    
    EXPOSE 3000
    CMD ["node", "server.js"]
    