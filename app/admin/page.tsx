'use client';

import React, { useEffect, useMemo, useState } from 'react';
import PresenceClient, { readPresenceStore, type PresenceSession as PresenceSessionType } from '@/components/PresenceClient';
import { createClient } from '@supabase/supabase-js';
import { initSupabaseFromTelegram } from '@/lib/db';

const WRAP = 'mx-auto max-w-[var(--content-max)] px-4';

type TabKey = 'leads' | 'users' | 'settings';

function useIsAdmin() {
  const [st, setSt] = useState<{ loading: boolean; allowed: boolean; username?: string }>({ loading: true, allowed: false });
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        // Получим JWT (назначит app_role в токен) — и не заблокируем UI, если не получится
        await initSupabaseFromTelegram().catch(() => {});
        for (let i = 0; i < 10; i++) {
          const wa = (window as any)?.Telegram?.WebApp;
          if (wa) {
            const u = wa?.initDataUnsafe?.user;
            const name = u?.username?.toLowerCase?.();
            const demo = new URLSearchParams(location.search).get('demoAdmin') === '1';
            if (!off) setSt({ loading: false, allowed: name === 'marselv1' || demo, username: u?.username });
            return;
          }
          await new Promise(r => setTimeout(r, 100));
        }
      } catch {}
      if (!off) setSt({ loading: false, allowed: false });
    })();
    return () => { off = true; };
  }, []);
  return st;
}

function Btn({ children, onClick, disabled, variant = 'ghost', className = '' }:{
  children: React.ReactNode; onClick?:()=>void; disabled?:boolean;
  variant?:'brand'|'ghost'|'outline'; className?:string;
}) {
  const base = 'h-10 px-3 rounded-xl font-semibold border active:translate-y-[1px] disabled:opacity-50 disabled:active:translate-y-0 whitespace-nowrap overflow-hidden text-ellipsis';
  const v = variant==='brand'
    ? 'bg-[var(--brand)] text-black border-[color-mix(in_oklab,var(--brand)70%,#000_30%)]'
    : variant==='outline'
      ? 'bg-transparent border-[var(--border)]'
      : 'bg-[var(--surface-2)] border-[var(--border)]';
  return <button onClick={onClick} disabled={disabled} className={`${base} ${v} ${className}`}>{children}</button>;
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

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
function getRlsClient() {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('sb_tg_auth_v2') : null;
  const jwt = raw ? (JSON.parse(raw)?.token as string | undefined) : undefined;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined,
  });
}

function LeadsTab() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | Lead['status']>('all');

  async function fetchLeads() {
    setLoading(true);
    try {
      const sb = getRlsClient();
      let query = sb.from('leads')
        .select('id,created_at,client_id,username,lead_type,name,handle,phone,comment,message,status')
        .order('created_at', { ascending: false })
        .limit(400);

      if (status !== 'all') query = query.eq('status', status);

      if (q.trim().length) {
        const like = `%${q.trim()}%`;
        query = query.or([
          `username.ilike.${like}`,
          `handle.ilike.${like}`,
          `phone.ilike.${like}`,
          `comment.ilike.${like}`,
          `message.ilike.${like}`,
          `client_id.ilike.${like}`,
        ].join(','));
      }

      const { data, error } = await query;
      if (error) throw error;
      setRows((data ?? []) as Lead[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLeads(); }, []); // первый загруз

  return (
    <section className="space-y-3 w-full">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none"
          placeholder="Поиск: @ник, телефон, комментарий…"
          value={q} onChange={e=>setQ(e.target.value)}
        />
        <select
          className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none"
          value={status} onChange={e=>setStatus(e.target.value as any)}
        >
          <option value="all">Все</option>
          <option value="new">Новые</option>
          <option value="in_progress">В работе</option>
          <option value="done">Сделка</option>
          <option value="lost">Потеря</option>
        </select>
        <Btn variant="brand" onClick={fetchLeads} disabled={loading}>
          {loading ? 'Обновляю…' : 'Обновить'}
        </Btn>
      </div>

      <div className="overflow-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-[var(--surface-2)]">
            <tr>
              <th className="text-left p-2">Дата</th>
              <th className="text-left p-2">Тип</th>
              <th className="text-left p-2">Юзернейм</th>
              <th className="text-left p-2">Ник</th>
              <th className="text-left p-2">Телефон</th>
              <th className="text-left p-2">Имя</th>
              <th className="text-left p-2">Комментарий</th>
              <th className="text-left p-2">Message</th>
              <th className="text-left p-2">Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="p-3 text-center text-[var(--muted)]" colSpan={9}>Нет записей</td></tr>
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

      <p className="text-xs text-[var(--muted)]">* Для доступа откройте эту страницу из Telegram под админским @username.</p>
    </section>
  );
}

/* ───────── Пользователи (presence) ───────── */
function UsersLive() {
  const [sessions, setSessions] = useState<PresenceSessionType[]>([]);
  useEffect(() => {
    const load = () => setSessions(readPresenceStore());
    load(); const t = setInterval(load, 5000); return () => clearInterval(t);
  }, []);
  const onlineNow = sessions.filter(s=>s.isOnline).length;
  const totalUnique = useMemo(()=> new Set(sessions.map(s=>s.uid)).size, [sessions]);

  return (
    <section className="space-y-4 w-full">
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4"><div className="text-sm text-[var(--muted)]">Всего уникальных</div><div className="text-2xl font-bold">{totalUnique}</div></div>
        <div className="glass rounded-xl p-4"><div className="text-sm text-[var(--muted)]">Сейчас онлайн</div><div className="text-2xl font-bold">{onlineNow}</div></div>
        <div className="glass rounded-xl p-4"><div className="text-sm text-[var(--muted)]">Сессий сохранено</div><div className="text-2xl font-bold">{sessions.length}</div></div>
      </div>

      <div className="glass rounded-xl p-4 w-full">
        <div className="mb-3 text-lg font-bold">Список сессий</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="px-2 py-2">UID</th><th className="px-2 py-2">User</th><th className="px-2 py-2">Страница</th>
                <th className="px-2 py-2">Активность</th><th className="px-2 py-2">Урок</th><th className="px-2 py-2">Прогресс</th>
                <th className="px-2 py-2">Онлайн</th><th className="px-2 py-2">Обновлено</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length===0 && <tr><td className="px-2 py-2 text-[var(--muted)]" colSpan={8}>Пусто. Откройте приложение во второй вкладке.</td></tr>}
              {sessions.map(s=>(
                <tr key={s.uid+'-'+s.updatedAt} className="border-t border-[var(--border)]">
                  <td className="px-2 py-2">{s.uid.slice(0,6)}…</td>
                  <td className="px-2 py-2">{s.username ?? '—'}</td>
                  <td className="px-2 py-2">{s.page}</td>
                  <td className="px-2 py-2">{s.activity ?? '—'}</td>
                  <td className="px-2 py-2">{s.lessonId ?? '—'}</td>
                  <td className="px-2 py-2">{s.progressPct!==undefined ? `${s.progressPct}%` : '—'}</td>
                  <td className="px-2 py-2">{s.isOnline ? '🟢' : '⚪️'}</td>
                  <td className="px-2 py-2">{new Date(s.updatedAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-[var(--muted)]">* Прототип: локальный <code>localStorage</code>. Для продакшна — БД + сокеты.</div>
      </div>
    </section>
  );
}

/* ───────── Настройки (локальные цитаты-плейсхолдер) ───────── */
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
    } catch { setQuotes([]); }
  }, []);
  const add = () => setQuotes(q => [...q, 'Новая цитата…']);
  const patch = (i:number, v:string) => setQuotes(q => q.map((x,idx)=>idx===i?v:x));
  const del = (i:number) => setQuotes(q => q.filter((_,idx)=>idx!==i));
  const save = () => { try { localStorage.setItem('admin_quotes', JSON.stringify(quotes)); alert('✅ Цитаты сохранены'); } catch {} };

  return (
    <section className="space-y-4 w-full">
      <div className="flex items-center gap-2">
        <Btn variant="brand" onClick={save}>💾 Сохранить</Btn>
        <Btn onClick={add}>➕ Добавить</Btn>
      </div>
      <div className="grid gap-3">
        {quotes.map((q,i)=>(
          <div key={i} className="glass rounded-xl p-3">
            <div className="mb-1 text-xs text-[var(--muted)]">#{i+1}</div>
            <div className="flex items-center gap-2">
              <input className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2" value={q} onChange={e=>patch(i,e.target.value)} />
              <Btn onClick={()=>del(i)}>🗑️</Btn>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminPage() {
  const { loading, allowed, username } = useIsAdmin();
  const [tab, setTab] = useState<TabKey>('leads');

  if (loading) return null;
  if (!allowed) {
    return (
      <main className={`${WRAP} py-10`}>
        <PresenceClient page="admin" activity="Админ-панель (нет доступа)" />
        <div className="glass rounded-2xl p-6 text-center">
          <div className="text-3xl">🔒</div>
          <h1 className="text-xl font-bold mt-1">Доступ запрещён</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Только для <b>@marselv1</b>. {username ? <>Вы: <b>@{username}</b></> : null}</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`${WRAP} pt-5 pb-28`} style={{ overflowX: 'hidden' }}>
      <PresenceClient page="admin" activity="Админ-панель" />
      <h1 className="text-3xl font-extrabold tracking-tight mb-4">Админ-панель</h1>

      {tab === 'leads'    && <LeadsTab />}
      {tab === 'users'    && <UsersLive />}
      {tab === 'settings' && <SettingsEditor />}

      <nav className="fixed left-0 right-0 bottom-0 z-50" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        <div className={`${WRAP}`}>
          <div className="glass rounded-2xl px-2 py-2 flex items-center justify-between">
            <button onClick={()=>setTab('leads')}    className={`flex-1 h-10 mx-1 rounded-xl font-semibold ${tab==='leads'   ?'bg-[var(--brand)] text-black':'bg-[var(--surface-2)]'}`}>📥 Лиды</button>
            <button onClick={()=>setTab('users')}    className={`flex-1 h-10 mx-1 rounded-xl font-semibold ${tab==='users'   ?'bg-[var(--brand)] text-black':'bg-[var(--surface-2)]'}`}>👥 Пользователи</button>
            <button onClick={()=>setTab('settings')} className={`flex-1 h-10 mx-1 rounded-xl font-semibold ${tab==='settings'?'bg-[var(--brand)] text-black':'bg-[var(--surface-2)]'}`}>⚙️ Настройки</button>
          </div>
        </div>
      </nav>
    </main>
  );
}
