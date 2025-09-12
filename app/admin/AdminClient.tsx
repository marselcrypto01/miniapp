// app/admin/AdminClient.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import PresenceClient from '@/components/PresenceClient';
import { createClient } from '@supabase/supabase-js';
import { initSupabaseFromTelegram } from '@/lib/db';

const WRAP = 'mx-auto max-w-[var(--content-max)] px-4';

type TabKey = 'leads' | 'users' | 'materials' | 'tests' | 'settings';

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
        // Ждём SDK чуть дольше, чтобы не было ложных отказов на мобильной сети
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
    return () => { off = true; };
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

  useEffect(() => { fetchLeads(); }, []); // eslint-disable-line

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
            onKeyDown={(e) => { if (e.key === 'Enter') fetchLeads(); }}
          />
          <Btn variant="brand" onClick={fetchLeads} disabled={loading}>
            {loading ? 'Обновляю…' : 'Обновить'}
          </Btn>
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          {(['all', 'new', 'in_progress', 'done', 'lost'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setTimeout(fetchLeads, 0); }}
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
                <td className="p-3 text-center text-[var(--muted)]" colSpan={8}>
                  Нет записей
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)] align-top">
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">{r.lead_type === 'consult' ? 'Консультация' : 'Обучение'}</td>
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

/* ───────── Таб «Результаты тестов» ───────── */
function TestsTab() {
  const [rows, setRows] = useState<Array<{ client_id: string | null; username: string | null; lesson_id: number | null; percentage: number | null; occurred_at: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [lessonFilter, setLessonFilter] = useState<string>('all');
  const [minPct, setMinPct] = useState<string>('');
  const [maxPct, setMaxPct] = useState<string>('');
  const [since, setSince] = useState<string>('');

  async function load() {
    setLoading(true);
    try {
      const sb = getRlsClient();
      const { data, error } = await sb
        .from('user_events')
        .select('client_id, username, lesson_id, meta, occurred_at')
        .eq('event', 'test_pass')
        .order('occurred_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      let mapped: Array<{ client_id: string | null; username: string | null; lesson_id: number | null; percentage: number | null; occurred_at: string }> = (data ?? []).map((r: any) => ({
        client_id: r.client_id || null,
        username: r.username || null,
        lesson_id: r.lesson_id ?? null,
        percentage: (r.meta?.percentage ?? null) as number | null,
        occurred_at: r.occurred_at as string,
      }));

      // Fallback для username: берём последний из leads, lesson_progress или presence_live
      const missingIds = Array.from(new Set(mapped.filter(r => !r.username && r.client_id).map(r => r.client_id as string)));
      if (missingIds.length) {
        const [leadsRes, progRes, presRes] = await Promise.all([
          sb.from('leads')
            .select('client_id, username, created_at')
            .in('client_id', missingIds)
            .order('created_at', { ascending: false })
            .limit(2000),
          sb.from('lesson_progress')
            .select('client_id, username, updated_at')
            .in('client_id', missingIds)
            .order('updated_at', { ascending: false })
            .limit(2000),
          sb.from('presence_live')
            .select('client_id, username, updated_at')
            .in('client_id', missingIds)
            .order('updated_at', { ascending: false })
            .limit(5000),
        ]);

        const leadMap = new Map<string, string>();
        (leadsRes.data as any[] | null)?.forEach((r) => {
          const id = String(r.client_id);
          if (!leadMap.has(id) && r.username) leadMap.set(id, String(r.username));
        });

        const progMap = new Map<string, string>();
        (progRes.data as any[] | null)?.forEach((r) => {
          const id = String(r.client_id);
          if (!progMap.has(id) && r.username) progMap.set(id, String(r.username));
        });

        const presMap = new Map<string, string>();
        (presRes.data as any[] | null)?.forEach((r) => {
          const id = String(r.client_id);
          if (!presMap.has(id) && r.username) presMap.set(id, String(r.username));
        });

        mapped = mapped.map((r) => {
          if (r.username) return r;
          const id = r.client_id ? String(r.client_id) : '';
          const u = leadMap.get(id) || progMap.get(id) || presMap.get(id) || null;
          return { ...r, username: u };
        });
      }

      setRows(mapped);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <section className="space-y-3 w-full">
      <div className="space-y-2">
        <div className="text-lg font-bold">Результаты тестов</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 items-center">
          <select className="h-9 rounded-xl px-2 bg-[var(--surface-2)] border border-[var(--border)]" value={lessonFilter} onChange={(e)=>setLessonFilter(e.target.value)}>
            <option value="all">Все уроки</option>
            <option value="1">Урок 1</option>
            <option value="2">Урок 2</option>
            <option value="3">Урок 3</option>
            <option value="4">Урок 4</option>
            <option value="5">Урок 5</option>
            <option value="6">Урок 6</option>
          </select>
          <input placeholder="Минимум %" className="h-9 rounded-xl px-2 bg-[var(--surface-2)] border border-[var(--border)]" value={minPct} onChange={(e)=>setMinPct(e.target.value.replace(/[^0-9]/g,''))} />
          <input placeholder="Максимум %" className="h-9 rounded-xl px-2 bg-[var(--surface-2)] border border-[var(--border)]" value={maxPct} onChange={(e)=>setMaxPct(e.target.value.replace(/[^0-9]/g,''))} />
          <input type="date" className="h-9 rounded-xl px-2 bg-[var(--surface-2)] border border-[var(--border)]" value={since} onChange={(e)=>setSince(e.target.value)} />
          <Btn variant="outline" onClick={load} disabled={loading}>↻ Обновить</Btn>
          <Btn variant="brand" onClick={()=>exportCsv()} disabled={rows.length===0}>⬇️ CSV</Btn>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-[var(--border)]">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-[var(--surface-2)]">
            <tr className="[&>th]:text-left [&>th]:p-2">
              <th>Юзернейм</th>
              <th>Урок</th>
              <th>%</th>
              <th>Когда</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="p-3 text-center text-[var(--muted)]" colSpan={4}>Пока пусто</td></tr>
            )}
            {rows
              .filter(r => lessonFilter==='all' || String(r.lesson_id||'')===lessonFilter)
              .filter(r => minPct==='' || (typeof r.percentage==='number' && r.percentage>=Number(minPct)))
              .filter(r => maxPct==='' || (typeof r.percentage==='number' && r.percentage<=Number(maxPct)))
              .filter(r => {
                if (!since) return true;
                const d = new Date(r.occurred_at).toISOString().slice(0,10);
                return d >= since;
              })
              .map((r, i) => (
              <tr key={i} className="border-t border-[var(--border)]">
                <td className="p-2">{r.username ? `@${String(r.username).replace(/^@+/, '')}` : '—'}</td>
                <td className="p-2">{r.lesson_id ?? '—'}</td>
                <td className="p-2">{typeof r.percentage === 'number' ? `${r.percentage}%` : '—'}</td>
                <td className="p-2">{new Date(r.occurred_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function exportCsvFilename() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `tests_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
}

function exportCsv() {
  // Соберём таблицу из текущих строк на странице
  const table = document.querySelector('table');
  if (!table) return;
  const rows: string[] = [];
  const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  rows.push(['username','lesson_id','percentage','occurred_at'].join(','));
  table.querySelectorAll('tbody tr').forEach((tr) => {
    const tds = tr.querySelectorAll('td');
    if (tds.length < 4) return;
    rows.push([
      esc((tds[0].textContent || '').trim()),
      (tds[1].textContent || '').trim(),
      (tds[2].textContent || '').trim().replace('%',''),
      (tds[3].textContent || '').trim(),
    ].join(','));
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportCsvFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ───────── Users: presence_live с «липкими» полями ───────── */

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

      // Берём за последние 14 дней — чтобы контекст сохранялся и после выхода
      const SINCE_DAYS = 14;
      const since = new Date(Date.now() - SINCE_DAYS * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await sb
        .from('presence_live')
        .select('client_id, username, page, activity, lesson_id, progress_pct, updated_at')
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(5000);
      if (error) throw error;

      setRows((data ?? []) as PresenceRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresence();
    const t = setInterval(fetchPresence, 10000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  // Собираем «снимок» по пользователю:
  // - Берём самую свежую запись как основу (в rows уже desc)
  // - Если в свежей записи нет page/activity/lesson_id/progress_pct, подтягиваем их из более старых записей
  const latestSticky = useMemo(() => {
    const map = new Map<string, PresenceRow & { _firstAt: number }>();

    const isEmptyStr = (x: any) => typeof x === 'string' && x.trim() === '';
    const valOrNull = <T,>(x: T | null | undefined) => (x === undefined || x === null || isEmptyStr(x) ? null : (x as any));

    for (const r of rows) {
      const key = r.client_id || 'unknown';
      const cur = map.get(key);

      if (!cur) {
        // первая (самая свежая) запись — база
        map.set(key, { ...r, _firstAt: new Date(r.updated_at).getTime() });
        continue;
      }

      // дополняем пустые поля «свежей» записи тем, что встречаем в более старых
      const merged = { ...cur };

      if (valOrNull(merged.page) === null && valOrNull(r.page) !== null) merged.page = r.page;
      if (valOrNull(merged.activity) === null && valOrNull(r.activity) !== null) merged.activity = r.activity;

      if (merged.lesson_id === null && r.lesson_id !== null) merged.lesson_id = r.lesson_id;

      // прогресс — возьмём максимум из встреченных (на случай разночтений)
      if (merged.progress_pct === null && r.progress_pct !== null) {
        merged.progress_pct = r.progress_pct;
      } else if (
        typeof merged.progress_pct === 'number' &&
        typeof r.progress_pct === 'number' &&
        r.progress_pct > merged.progress_pct
      ) {
        merged.progress_pct = r.progress_pct;
      }

      // username тоже можно «прилипать», если внезапно пустой (редко, но пусть будет)
      if (valOrNull(merged.username) === null && valOrNull(r.username) !== null) merged.username = r.username;

      map.set(key, merged);
    }

    // Возвращаем массив «снимков», уже в порядке свежести по первой записи
    return Array.from(map.values()).sort((a, b) => b._firstAt - a._firstAt);
  }, [rows]);

  const onlineThresholdMs = 45_000;
  const onlineNow  = latestSticky.filter((r) => Date.now() - new Date(r.updated_at).getTime() < onlineThresholdMs).length;
  const totalUsers = latestSticky.length;

  return (
    <section className="space-y-4 w-full">
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4">
          <div className="text-sm text-[var(--muted)]">Всего уникальных</div>
          <div className="text-2xl font-bold">{totalUsers}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-sm text-[var(--muted)]">Сейчас онлайн</div>
          <div className="text-2xl font-bold">{onlineNow}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-sm text-[var(--muted)]">Записей (14 дней)</div>
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
              {latestSticky.length === 0 && (
                <tr>
                  <td className="px-2 py-3 text-[var(--muted)]" colSpan={7}>
                    Пусто
                  </td>
                </tr>
              )}
              {latestSticky.map((s) => {
                const isOnline = Date.now() - new Date(s.updated_at).getTime() < onlineThresholdMs;
                return (
                  <tr key={(s.client_id || 'unknown') + '-' + s.updated_at} className="border-t border-[var(--border)]">
                    <td className="px-2 py-2">{s.username ? `@${s.username.replace(/^@+/, '')}` : '—'}</td>
                    <td className="px-2 py-2">{s.page || '—'}</td>
                    <td className="px-2 py-2">{s.activity || '—'}</td>
                    <td className="px-2 py-2">{s.lesson_id ?? '—'}</td>
                    <td className="px-2 py-2">{typeof s.progress_pct === 'number' ? `${s.progress_pct}%` : '—'}</td>
                    <td className="px-2 py-2">{isOnline ? '🟢' : '⚪️'}</td>
                    <td className="px-2 py-2">{new Date(s.updated_at).toLocaleTimeString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-[var(--muted)]">
          * Источник: <code>presence_live</code>. Поля «Страница», «Активность», «Урок», «Прогресс» сохраняют последнее
          известное значение за 14&nbsp;дней.
        </div>
      </div>
    </section>
  );
}

/* ───────── Материалы уроков (CRUD) ───────── */
import { getLessonMaterials, adminUpsertMaterial, adminDeleteMaterial, type DbLessonMaterial } from '@/lib/db';

function MaterialsTab() {
  const [lessonId, setLessonId] = useState<number>(1);
  const [items, setItems] = useState<DbLessonMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{ id?: string; title: string; url: string; kind: 'link' | 'text' | 'image'; description?: string }>(
    { title: '', url: '', kind: 'link', description: '' }
  );

  async function load() {
    setLoading(true);
    try {
      const data = await getLessonMaterials(lessonId);
      setItems(data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [lessonId]); // eslint-disable-line

  async function save() {
    if (!form.title.trim()) return alert('Введите заголовок');
    if (form.kind !== 'text' && !form.url.trim()) return alert('Введите ссылку/URL');
    setLoading(true);
    try {
      await adminUpsertMaterial({ id: form.id, lesson_id: lessonId, title: form.title.trim(), url: form.url, kind: form.kind, description: form.description });
      setForm({ title: '', url: '', kind: 'link', description: '' });
      await load();
    } catch (e: any) {
      alert('Ошибка: ' + (e?.message || e));
    } finally { setLoading(false); }
  }

  async function del(id: string) {
    if (!confirm('Удалить материал?')) return;
    setLoading(true);
    try { await adminDeleteMaterial(id); await load(); } finally { setLoading(false); }
  }

  function edit(m: DbLessonMaterial) {
    setForm({ id: m.id, title: m.title, url: m.url, kind: m.kind, description: m.description || '' });
  }

  return (
    <section className="space-y-3 w-full">
      <div className="glass rounded-2xl p-3 flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--muted)]">Урок</label>
          <input
            type="number"
            min={1}
            className="h-10 w-[100px] rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none"
            value={lessonId}
            onChange={(e) => setLessonId(Number(e.target.value) || 1)}
          />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs text-[var(--muted)]">Заголовок</label>
          <input
            className="h-10 w-full rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Напр.: Глоссарий новичка"
          />
        </div>
        <div className="w-[160px]">
          <label className="text-xs text-[var(--muted)]">Тип</label>
          <select
            className="h-10 w-full rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none"
            value={form.kind}
            onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as any }))}
          >
            <option value="link">Ссылка</option>
            <option value="image">Картинка</option>
            <option value="text">Текст</option>
          </select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs text-[var(--muted)]">{form.kind === 'text' ? 'Текст' : 'URL'}</label>
          {form.kind === 'text' ? (
            <textarea
              className="min-h-[120px] w-full rounded-xl px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] outline-none resize-y"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="Введите текст с абзацами (Enter — новая строка)"
            />
          ) : (
            <input
              className="h-10 w-full rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://… или public URL картинки"
            />
          )}
        </div>
        {form.kind === 'image' && (
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs text-[var(--muted)]">Описание (для картинок)</label>
            <input
              className="h-10 w-full rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Короткое описание изображения"
            />
          </div>
        )}
        <Btn variant="brand" onClick={save} disabled={loading}>{form.id ? '💾 Обновить' : '➕ Добавить'}</Btn>
        {form.id && (
          <Btn onClick={() => setForm({ title: '', url: '', kind: 'link', description: '' })}>Отмена</Btn>
        )}
      </div>

      <div className="overflow-auto rounded-2xl border border-[var(--border)]">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-[var(--surface-2)]">
            <tr className="[&>th]:text-left [&>th]:p-2">
              <th className="w-[64px]">#</th>
              <th>Заголовок</th>
              <th>Тип</th>
              <th>Ссылка/Текст</th>
              <th>Описание</th>
              <th className="w-[150px]">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td className="p-3 text-center text-[var(--muted)]" colSpan={5}>
                  Нет материалов для урока {lessonId}
                </td>
              </tr>
            )}
            {items.map((m, idx) => (
              <tr key={m.id} className="border-t border-[var(--border)] align-top">
                <td className="p-2 text-xs text-[var(--muted)]">{idx + 1}</td>
                <td className="p-2 font-medium">{m.title}</td>
                <td className="p-2">{m.kind}</td>
                <td className="p-2 break-words max-w-[420px]">
                  {m.kind === 'text' ? (
                    <div className="text-[13px] whitespace-pre-wrap">{m.url}</div>
                  ) : (
                    <a href={m.url} target="_blank" rel="noreferrer" className="text-[13px] text-[var(--brand)] underline break-all">{m.url}</a>
                  )}
                </td>
                <td className="p-2 text-xs text-[var(--muted)] max-w-[260px] break-words">{m.description || '—'}</td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <Btn onClick={() => edit(m)} className="h-8">✏️</Btn>
                    <Btn onClick={() => del(m.id)} className="h-8">🗑️</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--muted)]">Материалы читаются публично, изменения требуют админ-JWT из Telegram.</p>
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
        <Btn variant="brand" onClick={save}>💾 Сохранить</Btn>
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
export default function AdminClient() {
  const { loading, allowed, username } = useIsAdmin();
  const [tab, setTab] = useState<TabKey>('materials');

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
      {tab === 'materials' && <MaterialsTab />}
      {tab === 'tests' && <TestsTab />}
      {tab === 'settings' && <SettingsEditor />}

      {/* Нижний таб-бар */}
      <nav className="fixed left-0 right-0 bottom-0 z-50" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        <div className={`${WRAP}`}>
          <div className="glass rounded-2xl px-2 py-2">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              <button onClick={() => setTab('leads')}      className={`h-10 w-full rounded-xl font-semibold ${tab === 'leads' ? 'bg-[var(--brand)] text-black' : 'bg-[var(--surface-2)]'}`}      title="Лиды">📥</button>
              <button onClick={() => setTab('users')}      className={`h-10 w-full rounded-xl font-semibold ${tab === 'users' ? 'bg-[var(--brand)] text-black' : 'bg-[var(--surface-2)]'}`}      title="Пользователи">👥</button>
              <button onClick={() => setTab('materials')}  className={`h-10 w-full rounded-xl font-semibold ${tab === 'materials' ? 'bg-[var(--brand)] text-black' : 'bg-[var(--surface-2)]'}`}  title="Материалы">📎</button>
              <button onClick={() => setTab('tests')}      className={`h-10 w-full rounded-xl font-semibold ${tab === 'tests' ? 'bg-[var(--brand)] text-black' : 'bg-[var(--surface-2)]'}`}      title="Тесты">🧪</button>
              <button onClick={() => setTab('settings')}   className={`h-10 w-full rounded-xl font-semibold ${tab === 'settings' ? 'bg-[var(--brand)] text-black' : 'bg-[var(--surface-2)]'}`}   title="Настройки">⚙️</button>
            </div>
          </div>
        </div>
      </nav>
    </main>
  );
}


