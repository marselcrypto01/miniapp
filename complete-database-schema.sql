-- =========================================================
--  MiniApp (Supabase/Postgres): Полная схема БД + RLS
--  ВАРИАНТ С ВИДЕО ИЗ VK (video_url внутри таблицы lessons)
--  Скрипт идемпотентен — можно выполнять повторно.
-- =========================================================
begin;

-- ---------- Расширения и общие функции ----------
create extension if not exists pgcrypto;

-- Обновление updated_at на update
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end$$;

-- JWT-хелперы (берём из JWT-клеймов Supabase)
create or replace function public.jwt_tg_id()
returns text language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'sub','')
$$;

create or replace function public.jwt_role()
returns text language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role','')
$$;

create or replace function public.jwt_app_role()
returns text language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'app_role','')
$$;

-- =========================================================
--                      CONTENT
-- =========================================================

-- ---------- LESSONS ----------
create table if not exists public.lessons (
  id           smallint    primary key,
  title        text        not null,
  subtitle     text,
  description  text,
  video_url    text,                    -- ССЫЛКА НА VK-видео (src из iframe)
  has_test     boolean     not null default false,
  order_index  smallint    not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists tr_lessons_updated on public.lessons;
create trigger tr_lessons_updated
before update on public.lessons
for each row execute function public.tg_set_updated_at();

create index if not exists idx_lessons_order on public.lessons(order_index, id);

-- ---------- LESSON MATERIALS ----------
-- Материалы урока (ссылки, текста, изображения). CRUD — только admin через app_role.
create table if not exists public.lesson_materials (
  id           uuid      primary key default gen_random_uuid(),
  lesson_id    smallint  not null references public.lessons(id) on delete cascade,
  title        text      not null,
  url          text      not null,                -- для kind='text' хранит сам текст
  kind         text      not null default 'link', -- 'link' | 'text' | 'image'
  description  text,                               -- подпись/описание (для link/image)
  position     smallint  not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_materials_lesson_pos on public.lesson_materials(lesson_id, position);

-- ---------- LESSON TESTS ----------
create table if not exists public.lesson_tests (
  id         uuid      primary key default gen_random_uuid(),
  lesson_id  smallint  not null references public.lessons(id) on delete cascade,
  question   text      not null,
  answers    jsonb     not null,
  correct    integer[] not null,
  position   smallint  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_tests_lesson_pos on public.lesson_tests(lesson_id, position);

-- ---------- DAILY QUOTES ----------
create table if not exists public.daily_quotes (
  id         bigserial   primary key,
  text       text        not null,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.get_random_quote()
returns text
language sql stable
as $$
  select text
  from public.daily_quotes
  where is_active
  order by random()
  limit 1
$$;

-- =========================================================
--                     USER DATA
-- =========================================================

-- ---------- LESSON PROGRESS ----------
create table if not exists public.lesson_progress (
  client_id   text      not null,
  lesson_id   smallint  not null references public.lessons(id) on delete cascade,
  status      text      not null check (status in ('pending','completed')),
  username    text,
  updated_at  timestamptz not null default now(),
  primary key (client_id, lesson_id)
);

-- на случай, если таблица уже была без username
alter table public.lesson_progress
  add column if not exists username text;

create index if not exists idx_progress_client on public.lesson_progress(client_id);

drop trigger if exists tr_progress_updated on public.lesson_progress;
create trigger tr_progress_updated
before update on public.lesson_progress
for each row execute function public.tg_set_updated_at();

-- ---------- USER ACHIEVEMENTS (опционально) ----------
create table if not exists public.user_achievements (
  client_id   text not null,
  key         text not null check (key in ('first','risk','finisher','simulator')),
  achieved_at timestamptz not null default now(),
  primary key (client_id, key)
);

-- ---------- PRESENCE (без RLS) ----------
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'presence_live'
      and c.relkind = 'v'
  ) then
    execute 'drop view if exists public.presence_live cascade';
  end if;
end
$$;

create table if not exists public.presence_live (
  id           uuid primary key default gen_random_uuid(),
  username     text,
  page         text,
  activity     text,
  lesson_id    smallint,
  progress_pct int check (progress_pct between 0 and 100),
  updated_at   timestamptz not null default now(),
  client_id    text
);

-- отключаем RLS — это «техническая» оперативная таблица
alter table public.presence_live disable row level security;

create index if not exists idx_presence_live_updated on public.presence_live(updated_at);
create index if not exists idx_presence_live_client  on public.presence_live(client_id);

-- ---------- LEADS ----------
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  client_id   text not null,
  username    text,
  lead_type   text not null check (lead_type in ('consult','course')),
  message     text,
  status      text not null default 'new' check (status in ('new','in_progress','done','lost')),
  created_at  timestamptz not null default now(),
  -- поля формы
  name        text,
  handle      text,
  phone       text,
  comment     text
);

create index if not exists idx_leads_created on public.leads(created_at);
create index if not exists idx_leads_status_created on public.leads(status, created_at desc);

-- Триггер: не-админ не может менять status и client_id
create or replace function public.tg_guard_leads()
returns trigger
language plpgsql
as $$
begin
  if public.jwt_app_role() <> 'admin' then
    if TG_OP = 'UPDATE' then
      if new.status    is distinct from old.status    then raise exception 'Only admin can change lead.status';  end if;
      if new.client_id is distinct from old.client_id then raise exception 'Cannot change lead.client_id';       end if;
    end if;
  end if;
  return new;
end$$;

drop trigger if exists tr_leads_guard on public.leads;
create trigger tr_leads_guard
before update on public.leads
for each row execute function public.tg_guard_leads();

-- ---------- USER EVENTS (аналитика) ----------
create table if not exists public.user_events (
  id          bigserial primary key,
  client_id   text not null,
  username    text,
  event       text not null check (event in ('app_open','lesson_view','test_start','test_pass','lead_submit','bonus_open')),
  lesson_id   smallint,
  meta        jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_user_events_client on public.user_events(client_id);
create index if not exists idx_user_events_event  on public.user_events(event, occurred_at);

-- =========================================================
--                     RLS POLICIES
-- =========================================================

-- Контент публично читается
alter table public.lessons           enable row level security;
alter table public.lesson_materials  enable row level security;
alter table public.lesson_tests      enable row level security;
alter table public.daily_quotes      enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lessons' and policyname='read_lessons') then
    create policy read_lessons on public.lessons for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lesson_materials' and policyname='read_materials') then
    create policy read_materials on public.lesson_materials for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lesson_tests' and policyname='read_tests') then
    create policy read_tests on public.lesson_tests for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='daily_quotes' and policyname='read_quotes') then
    create policy read_quotes on public.daily_quotes for select using (true);
  end if;
end
$$;

-- CRUD материалов — только admin
do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='lesson_materials') then
    drop policy if exists lm_insert on public.lesson_materials;
    drop policy if exists lm_update on public.lesson_materials;
    drop policy if exists lm_delete on public.lesson_materials;
  end if;
end
$$;

create policy lm_insert on public.lesson_materials
for insert to authenticated
with check (public.jwt_app_role() = 'admin');

create policy lm_update on public.lesson_materials
for update to authenticated
using     (public.jwt_app_role() = 'admin')
with check (public.jwt_app_role() = 'admin');

create policy lm_delete on public.lesson_materials
for delete to authenticated
using (public.jwt_app_role() = 'admin');

-- lesson_progress: только своё (или admin)
alter table public.lesson_progress enable row level security;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='lesson_progress') then
    drop policy if exists lp_select on public.lesson_progress;
    drop policy if exists lp_insert on public.lesson_progress;
    drop policy if exists lp_update on public.lesson_progress;
    drop policy if exists lp_delete on public.lesson_progress;
  end if;
end
$$;

create policy lp_select on public.lesson_progress
for select to authenticated
using (client_id = public.jwt_tg_id() or public.jwt_app_role() = 'admin');

create policy lp_insert on public.lesson_progress
for insert to authenticated
with check (client_id = public.jwt_tg_id() or public.jwt_app_role() = 'admin');

create policy lp_update on public.lesson_progress
for update to authenticated
using     (client_id = public.jwt_tg_id() or public.jwt_app_role() = 'admin')
with check (client_id = public.jwt_tg_id() or public.jwt_app_role() = 'admin');

create policy lp_delete on public.lesson_progress
for delete to authenticated
using (client_id = public.jwt_tg_id() or public.jwt_app_role() = 'admin');

-- user_achievements: свои/админ
alter table public.user_achievements enable row level security;

drop policy if exists ua_select on public.user_achievements;
drop policy if exists ua_write  on public.user_achievements;

create policy ua_select on public.user_achievements
for select to authenticated
using (client_id = public.jwt_tg_id() or public.jwt_app_role() = 'admin');

create policy ua_write on public.user_achievements
for all to authenticated
using     (client_id = public.jwt_tg_id() or public.jwt_app_role() = 'admin')
with check (client_id = public.jwt_tg_id() or public.jwt_app_role() = 'admin');

-- leads: пользователь видит/создаёт свои, админ — всё
alter table public.leads enable row level security;

drop policy if exists leads_select on public.leads;
drop policy if exists leads_insert on public.leads;
drop policy if exists leads_update on public.leads;

create policy leads_select on public.leads
for select to authenticated
using (client_id = public.jwt_tg_id() or public.jwt_app_role() = 'admin');

create policy leads_insert on public.leads
for insert to authenticated
with check (client_id = public.jwt_tg_id() or public.jwt_app_role() = 'admin');

create policy leads_update on public.leads
for update to authenticated
using     (client_id = public.jwt_tg_id() or public.jwt_app_role() = 'admin')
with check (client_id = public.jwt_tg_id() or public.jwt_app_role() = 'admin');

-- user_events: ИСПРАВЛЕННЫЕ ПОЛИТИКИ для записи событий тестов
alter table public.user_events enable row level security;

-- Удаляем старые политики
drop policy if exists ue_select on public.user_events;
drop policy if exists ue_insert on public.user_events;

-- Политика для чтения: админы видят все, пользователи видят только свои
create policy ue_select on public.user_events
for select to authenticated
using (
  client_id = public.jwt_tg_id() OR 
  public.jwt_app_role() = 'admin'
);

-- Политика для записи: разрешаем всем (включая неавторизованных) записывать события
create policy ue_insert on public.user_events
for insert to anon, authenticated
with check (true);

-- Дополнительная политика для записи через публичный клиент
create policy ue_insert_public on public.user_events
for insert to anon
with check (true);

-- presence_live: RLS отключён (см. выше)

-- =========================================================
--               RPC ФУНКЦИЯ ДЛЯ ЗАПИСИ СОБЫТИЙ ТЕСТОВ
-- =========================================================
create or replace function public.record_test_pass(
  p_client_id text,
  p_lesson_id smallint,
  p_correct_answers integer,
  p_total_questions integer,
  p_percentage integer,
  p_username text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Выполняется с правами создателя функции
AS $$
BEGIN
  INSERT INTO public.user_events (
    client_id,
    username,
    event,
    lesson_id,
    meta
  ) VALUES (
    p_client_id,
    p_username,
    'test_pass',
    p_lesson_id,
    jsonb_build_object(
      'correct_answers', p_correct_answers,
      'total_questions', p_total_questions,
      'percentage', p_percentage
    )
  );
END;
$$;

-- Даем права на выполнение функции всем пользователям
GRANT EXECUTE ON FUNCTION public.record_test_pass TO anon, authenticated;

-- =========================================================
--               ADMIN RPC: сводка прогресса
-- =========================================================
create or replace function public.admin_progress_summary()
returns table (
  client_id         text,
  username          text,
  completed_lessons int,
  total_lessons     int,
  completed_pct     int,
  next_lesson_id    int,
  tests_passed      int,
  score             int,
  last_activity     timestamptz
)
language sql
stable
as $$
with base as (
  -- клиенты из прогресса и лидов
  select distinct client_id from public.lesson_progress
  union
  select distinct client_id from public.leads
),
total as (
  select count(*)::int as total_lessons from public.lessons
),
-- последний username из leads
lead_names as (
  select l.client_id,
         (array_remove(array_agg(l.username order by l.created_at desc), null))[1] as username
  from public.leads l
  group by l.client_id
),
-- резервный username из lesson_progress
prog_names as (
  select lp.client_id,
         (array_remove(array_agg(lp.username order by lp.updated_at desc), null))[1] as username,
         max(lp.updated_at) as last_activity
  from public.lesson_progress lp
  group by lp.client_id
),
comp as (
  select client_id,
         count(*) filter (where status='completed')::int as completed_lessons,
         max(updated_at) as last_activity
  from public.lesson_progress
  group by client_id
),
tests as (
  select client_id, count(*)::int as tests_passed
  from public.user_events
  where event='test_pass'
  group by client_id
)
select
  b.client_id,
  coalesce(ln.username, pn.username) as username,
  coalesce(c.completed_lessons, 0) as completed_lessons,
  (select total_lessons from total) as total_lessons,
  case when (select total_lessons from total)=0 then 0
       else floor(100.0 * coalesce(c.completed_lessons,0) / (select total_lessons from total))::int
  end as completed_pct,
  (
    select min(l.id)
    from public.lessons l
    left join public.lesson_progress lp
      on lp.lesson_id = l.id
     and lp.client_id = b.client_id
     and lp.status    = 'completed'
    where lp.lesson_id is null
  ) as next_lesson_id,
  coalesce(t.tests_passed,0) as tests_passed,
  (coalesce(c.completed_lessons,0)*10 + coalesce(t.tests_passed,0)*20)::int as score,
  greatest(coalesce(c.last_activity, 'epoch'::timestamptz), coalesce(pn.last_activity, 'epoch'::timestamptz)) as last_activity
from base b
left join comp c   on c.client_id=b.client_id
left join tests t  on t.client_id=b.client_id
left join lead_names ln on ln.client_id=b.client_id
left join prog_names pn on pn.client_id=b.client_id
order by last_activity desc nulls last;
$$;

-- =========================================================
--                         SEED
--         (уроки 1–5 + видео_url из VK, + цитаты)
-- =========================================================

-- NB: video_url — это src из iframe. Не вставляем весь <iframe>.
insert into public.lessons (id, title, subtitle, description, video_url, has_test, order_index)
values
 (1,'Крипта простыми словами', null, 'Вводный обзор, как всё устроено',
  'https://vkvideo.ru/video_ext.php?oid=-232370516&id=456239108&hd=4&hash=f7a8774a46c42003', true,  1),
 (2,'Арбитраж: как это работает', null, 'Суть арбитража и базовые механики',
  'https://vkvideo.ru/video_ext.php?oid=-232370516&id=456239109&hd=4&hash=6cf7acb62455397d', true,  2),
 (3,'Риски, мифы и страхи',      null, 'Управление рисками и типичные ошибки',
  'https://vkvideo.ru/video_ext.php?oid=-232370516&id=456239110&hd=4&hash=61fb46ca6efcd2ca', true,  3),
 (4,'Главные ошибки новичков',   null, 'Разбор распространённых фейлов',
  'https://vkvideo.ru/video_ext.php?oid=-232370516&id=456239111&hd=4&hash=f886761db99c9539', true,  4),
 (5,'Итог: как двигаться дальше',null, 'Дорожная карта после курса',
  'https://vkvideo.ru/video_ext.php?oid=-232370516&id=456239112&hd=4&hash=70005799c7f09ad1', false, 5)
on conflict (id) do update
set title       = excluded.title,
    subtitle    = excluded.subtitle,
    description = excluded.description,
    video_url   = excluded.video_url,
    has_test    = excluded.has_test,
    order_index = excluded.order_index;

insert into public.daily_quotes (text, is_active) values
 ('Учись видеть возможности там, где другие видят шум.', true),
 ('Успех любит дисциплину.', true),
 ('Лучший риск — тот, который просчитан.', true),
 ('Дорогу осилит идущий. Шаг за шагом.', true)
on conflict do nothing;

commit;
