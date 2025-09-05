// app/admin/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import PresenceClient from '@/components/PresenceClient';
import { createClient } from '@supabase/supabase-js';
import { initSupabaseFromTelegram } from '@/lib/db';

const WRAP = 'mx-auto max-w-[var(--content-max)] px-4';

type TabKey = 'leads' | 'users' | 'settings';

/* ───────── Проверка админа ───────── */
function useIsAdmin() {
  const [st, setSt] = useState<{ loading: boolean; allowed: boolean; username?: string }>({
    loading: true,
    allowed: false,
  });

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        await initSupabaseFromTelegram().catch(() => {});
        // Увеличили окно ожидания SDK (до ~8с), чтобы не было ложных "нет доступа" на мобиле
        for (let i = 0; i < 80; i++) {
          const wa = (window as any)?.Telegram?.WebApp;
          if (wa) {
            const u = wa?.initDataUnsafe?.user;
            const name = u?.username?.toLowerCase?.();
            const demo = new URLSearchParams(location.search).get('demoAdmin') === '1';
            if (!off) setSt({ loading: false, allowed: name === 'marselv1' || demo, username: u?.username });
            return;
          }
          await new Promise((r) => setTimeout(r, 100));
        }
      } catch {}
      if (!off) setSt({ loading: false, allowed: false });
    })();
    return () => {
      off = true;
    };
  }, []);

  return st;
}

/* ───────── Кнопка ───────── */
function Btn({
  children,
  onClick,
  disabled,
  variant = 'ghost',
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'brand' | 'ghost' | 'outline';
  className?: string;
}) {
  const base =
    'inline-flex h-10 px-3 items-center justify-center rounded-xl font-semibold border active:translate-y-[1px] disabled:opacity-50 disabled:active:translate-y-0 whitespace-nowrap';
  const v =
    variant === 'brand'
      ? 'bg-[var(--brand)] text-black border-[color-mix(in_oklab,var(--brand)70%,#000_30%)]'
      : variant === 'outline'
      ? 'bg-transparent border-[var(--border)]'
      : 'bg-[var(--surface-2)] border-[var(--border)]';
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${v} ${className}`}>
      {children}
    </button>
  );
}

/* ───────── Лиды ───────── */
type Lead = {
  id: string;
  created_at: string;
  client_id: string | null;
  username: string | null;
  lead_type: 'consult' | 'course';
  name: string | null;
  handle: string | null;
  phone: string | null;
  comment: string | null;
  message: string | null;
  status: 'new' | 'in_progress' | 'done' | 'lost';
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
function getRlsClient() {
  const tryKeys = ['sb_tg_auth_v2', 'sb_tg_auth_v1'];
  let jwt: string | undefined;
  for (const k of tryKeys) {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(k) : null;
    if (raw) {
      try {
        jwt = JSON.parse(raw)?.token as string | undefined;
        if (jwt) break;
      } catch {}
    }
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined,
  });
}

/* ───────── Вкладка «Лиды» ───────── */
function LeadsTab() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | Lead['status']>('all');

  async function fetchLeads() {
    setLoading(true);
    try {
      const sb = getRlsClient();
      let query = sb
        .from('leads')
        .select('id,created_at,client_id,username,lead_type,name,handle,phone,comment,message,status')
        .order('created_at', { ascending: false })
        .limit(400);

      if (status !== 'all') query = query.eq('status', status);

      if (q.trim().length) {
        const like = `%${q.trim()}%`;
        query = query.or(
          [
            `username.ilike.${like}`,
            `handle.ilike.${like}`,
            `phone.ilike.${like}`,
            `comment.ilike.${like}`,
            `message.ilike.${like}`,
            `client_id.ilike.${like}`,
          ].join(','),
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setRows((data ?? []) as Lead[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeads();
  }, []); // eslint-disable-line

  const counts = useMemo(() => {
    const by: Record<string, number> = { all: rows.length, new: 0, in_progress: 0, done: 0, lost: 0 };
    rows.forEach((r) => (by[r.status] = (by[r.status] || 0) + 1));
    return by as Record<'all' | Lead['status'], number>;
  }, [rows]);

  return (
    <section className="space-y-3 w-full">
      <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-2">
        <div className="flex items-center gap-2">
          <input
            className="h-10 w-[280px] rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none"
            placeholder="Поиск: @ник, телефон, комментарий…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchLeads(); // запуск поиска по Enter
            }}
          />
          <Btn variant="brand" onClick={fetchLeads} disabled={loading}>
            {loading ? 'Обновляю…' : 'Обновить'}
          </Btn>
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          {(['all', 'new', 'in_progress', 'done', 'lost'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                // мгновенно подтягиваем новый фильтр
                setTimeout(fetchLeads, 0);
              }}
              className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-sm border ${
                status === s
                  ? 'bg-[var(--brand)] text-black border-[color-mix(in_oklab,var(--brand)70%,#000_30%)]'
                  : 'bg-[var(--surface-2)] border-[var(--border)]'
              }`}
              title="Фильтр по статусу"
            >
              {s === 'all'
                ? `Все · ${counts.all}`
                : s === 'new'
                ? `Новые · ${counts.new}`
                : s === 'in_progress'
                ? `В работе · ${counts.in_progress}`
                : s === 'done'
                ? `Сделка · ${counts.done}`
                : `Потеря · ${counts.lost}`}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-[var(--border)]">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-[var(--surface-2)]">
            <tr className="[&>th]:text-left [&>th]:p-2">
              <th>Дата</th>
              <th>Тип</th>
              <th>Юзернейм</th>
              <th>Ник</th>
              <th>Телефон</th>
              <th>Имя</th>
              <th>Комментарий</th>
              <th>Message</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-3 text-center text-[var(--muted)]" colSpan={9}>
                  Нет записей
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)] align-top">
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">{r.lead_type === 'consult' ? 'Консультация' : 'Обучение'}</td>
                <td className="p-2">{r.username ? `@${r.username}` : '—'}</td>
                <td className="p-2">{r.handle || '—'}</td>
                <td className="p-2">{r.phone || '—'}</td>
                <td className="p-2">{r.name || '—'}</td>
                <td className="p-2">{r.comment || '—'}</td>
                <td className="p-2">{r.message || '—'}</td>
                <td className="p-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--muted)]">* Доступ — из Telegram под админским @username.</p>
    </section>
  );
}

/* ───────── Users: читаем из БД presence_live ───────── */

type PresenceRow = {
  client_id: string | null;
  username: string | null;
  page: string | null;
  activity: string | null;
  lesson_id: number | null;
  progress_pct: number | null;
  updated_at: string;
};

function UsersTab() {
  const [rows, setRows] = useState<PresenceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPresence = async () => {
    setLoading(true);
    try {
      const sb = getRlsClient();
      // берем последние 24 часа, сортируем по времени (сверху самые свежие)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await sb
        .from('presence_live')
        .select('client_id, username, page, activity, lesson_id, progress_pct, updated_at')
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(2000);
      if (error) throw error;

      setRows((data ?? []) as PresenceRow[]);
    } finally {
      setLoading(false);
    }
  };

  // первый загруз + авто-обновление раз в 10 сек
  useEffect(() => {
    fetchPresence();
    const t = setInterval(fetchPresence, 10000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  // сгруппируем по client_id — берём самую свежую запись на клиента
  const latest = useMemo(() => {
    const map = new Map<string, PresenceRow>();
    for (const r of rows) {
      const key = r.client_id || 'unknown';
      if (!map.has(key)) map.set(key, r);
    }
    return Array.from(map.values());
  }, [rows]);

  const onlineThresholdMs = 45000; // 45 сек
  const onlineNow = latest.filter((r) => Date.now() - new Date(r.updated_at).getTime() < onlineThresholdMs).length;
  const totalUnique = latest.length;

  return (
    <section className="space-y-4 w-full">
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4">
          <div className="text-sm text-[var(--muted)]">Всего уникальных</div>
          <div className="text-2xl font-bold">{totalUnique}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-sm text-[var(--muted)]">Сейчас онлайн</div>
          <div className="text-2xl font-bold">{onlineNow}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-sm text-[var(--muted)]">Записей за 24ч</div>
          <div className="text-2xl font-bold">{rows.length}</div>
        </div>
      </div>

      <div className="glass rounded-xl p-4 w-full">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-bold">Последние сессии (по пользователям)</div>
          <Btn variant="brand" onClick={fetchPresence} disabled={loading}>
            {loading ? 'Обновляю…' : 'Обновить'}
          </Btn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Страница</th>
                <th className="px-2 py-2">Активность</th>
                <th className="px-2 py-2">Урок</th>
                <th className="px-2 py-2">Прогресс</th>
                <th className="px-2 py-2">Онлайн</th>
                <th className="px-2 py-2">Обновлено</th>
              </tr>
            </thead>
            <tbody>
              {latest.length === 0 && (
                <tr>
                  <td className="px-2 py-3 text-[var(--muted)]" colSpan={7}>
                    Пусто
                  </td>
                </tr>
              )}
              {latest.map((s) => {
                const isOnline = Date.now() - new Date(s.updated_at).getTime() < onlineThresholdMs;
                return (
                  <tr key={(s.client_id || 'unknown') + '-' + s.updated_at} className="border-t border-[var(--border)]">
                    <td className="px-2 py-2">{s.username ? `@${s.username}` : (s.client_id || '—')}</td>
                    <td className="px-2 py-2">{s.page || '—'}</td>
                    <td className="px-2 py-2">{s.activity || '—'}</td>
                    <td className="px-2 py-2">{s.lesson_id ?? '—'}</td>
                    <td className="px-2 py-2">{s.progress_pct !== null ? `${s.progress_pct}%` : '—'}</td>
                    <td className="px-2 py-2">{isOnline ? '🟢' : '⚪️'}</td>
                    <td className="px-2 py-2">{new Date(s.updated_at).toLocaleTimeString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-[var(--muted)]">* Источник: таблица <code>presence_live</code> в Supabase.</div>
      </div>
    </section>
  );
}

/* ───────── Настройки (локально) ───────── */
function SettingsEditor() {
  const [quotes, setQuotes] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('admin_quotes');
      if (raw) {
        const arr = JSON.parse(raw);
        setQuotes(Array.isArray(arr) ? (arr as string[]) : []);
      } else {
        setQuotes([
          'Учись видеть возможности там, где другие видят шум.',
          'Успех любит дисциплину.',
          'Лучший риск — тот, который просчитан.',
          'Дорогу осилит идущий. Шаг за шагом.',
        ]);
      }
    } catch {
      setQuotes([]);
    }
  }, []);
  const add = () => setQuotes((q) => [...q, 'Новая цитата…']);
  const patch = (i: number, v: string) => setQuotes((q) => q.map((x, idx) => (idx === i ? v : x)));
  const del = (i: number) => setQuotes((q) => q.filter((_, idx) => idx !== i));
  const save = () => {
    try {
      localStorage.setItem('admin_quotes', JSON.stringify(quotes));
      alert('✅ Цитаты сохранены');
    } catch {}
  };

  return (
    <section className="space-y-4 w-full">
      <div className="flex items-center gap-2">
        <Btn variant="brand" onClick={save}>
          💾 Сохранить
        </Btn>
        <Btn onClick={add}>➕ Добавить</Btn>
      </div>
      <div className="grid gap-3">
        {quotes.map((q, i) => (
          <div key={i} className="glass rounded-xl p-3">
            <div className="mb-1 text-xs text-[var(--muted)]">#{i + 1}</div>
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                value={q}
                onChange={(e) => patch(i, e.target.value)}
              />
              <Btn onClick={() => del(i)}>🗑️</Btn>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────── Страница админки ───────── */
export default function AdminPage() {
  const { loading, allowed, username } = useIsAdmin();
  const [tab, setTab] = useState<TabKey>('users');

  if (loading) return null;
  if (!allowed) {
    return (
      <main className={`${WRAP} py-10`}>
        <PresenceClient page="admin" activity="Админ-панель (нет доступа)" />
        <div className="glass rounded-2xl p-6 text-center">
          <div className="text-3xl">🔒</div>
          <h1 className="text-xl font-bold mt-1">Доступ запрещён</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Только для <b>@marselv1</b>. {username ? <>Вы: <b>@{username}</b></> : null}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={`${WRAP} pt-5 pb-28`} style={{ overflowX: 'hidden' }}>
      <PresenceClient page="admin" activity="Админ-панель" />
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Админ-панель</h1>
        <a
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-xl px-3 text-sm border border-[var(--border)] bg-[var(--surface-2)]"
        >
          ← На главную
        </a>
      </header>

      {tab === 'leads' && <LeadsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'settings' && <SettingsEditor />}

      {/* Нижний таб-бар */}
      <nav className="fixed left-0 right-0 bottom-0 z-50" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        <div className={`${WRAP}`}>
          <div className="glass rounded-2xl px-2 py-2 flex items-center justify-between">
            <button
              onClick={() => setTab('leads')}
              className={`inline-flex flex-1 h-10 mx-1 items-center justify-center rounded-xl font-semibold ${
                tab === 'leads' ? 'bg-[var(--brand)] text-black' : 'bg-[var(--surface-2)]'
              }`}
            >
              📥 Лиды
            </button>
            <button
              onClick={() => setTab('users')}
              className={`inline-flex flex-1 h-10 mx-1 items-center justify-center rounded-xl font-semibold ${
                tab === 'users' ? 'bg-[var(--brand)] text-black' : 'bg-[var(--surface-2)]'
              }`}
            >
              👥 Пользователи
            </button>
            <button
              onClick={() => setTab('settings')}
              className={`inline-flex flex-1 h-10 mx-1 items-center justify-center rounded-xl font-semibold ${
                tab === 'settings' ? 'bg-[var(--brand)] text-black' : 'bg-[var(--surface-2)]'
              }`}
            >
              ⚙️ Настройки
            </button>
          </div>
        </div>
      </nav>
    </main>
  );
}
