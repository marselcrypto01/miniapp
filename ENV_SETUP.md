# Настройка переменных окружения

Для корректной работы записи событий тестов необходимо добавить переменную окружения `SUPABASE_SERVICE_ROLE_KEY`.

## Создайте файл `.env.local` в корне проекта:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## Где найти SUPABASE_SERVICE_ROLE_KEY:

1. Откройте ваш проект в Supabase Dashboard
2. Перейдите в Settings → API
3. Скопируйте "service_role" ключ (НЕ anon ключ!)
4. Вставьте его в `.env.local` как `SUPABASE_SERVICE_ROLE_KEY`

## Важно:

- **НЕ** коммитьте файл `.env.local` в git
- Service role ключ имеет полные права доступа к базе данных
- Используйте его только на сервере/в API routes
