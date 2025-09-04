'use client';

import React, { useEffect, useMemo, useState } from 'react';
import PresenceClient, { readPresenceStore, type PresenceSession as PresenceSessionType } from '@/components/PresenceClient';
import { LESSONS, type LessonMeta } from '@/lib/lessons';

const WRAP = 'mx-auto max-w-[var(--content-max)] px-4';

type TabKey = 'lessons' | 'users' | 'settings';

function useIsAdmin() {
  const [st, setSt] = useState<{ loading: boolean; allowed: boolean; username?: string }>({ loading: true, allowed: false });
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        for (let i = 0; i < 10; i++) {
          // @ts-ignore
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

export default function AdminPage() {
  const { loading, allowed, username } = useIsAdmin();
  const [tab, setTab] = useState<TabKey>('lessons');

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

      {tab === 'lessons' && <LessonsEditor />}
      {tab === 'users' && <UsersLive />}
      {tab === 'settings' && <SettingsEditor />}

      {/* нижний таб-бар админки (свой, не общий) */}
      <nav className="fixed left-0 right-0 bottom-0 z-50" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        <div className={`${WRAP}`}>
          <div className="glass rounded-2xl px-2 py-2 flex items-center justify-between">
            <button onClick={()=>setTab('lessons')} className={`flex-1 h-10 mx-1 rounded-xl font-semibold ${tab==='lessons'?'bg-[var(--brand)] text-black':'bg-[var(--surface-2)]'}`}>📚 Уроки</button>
            <button onClick={()=>setTab('users')}   className={`flex-1 h-10 mx-1 rounded-xl font-semibold ${tab==='users'  ?'bg-[var(--brand)] text-black':'bg-[var(--surface-2)]'}`}>👥 Пользователи</button>
            <button onClick={()=>setTab('settings')}className={`flex-1 h-10 mx-1 rounded-xl font-semibold ${tab==='settings'?'bg-[var(--brand)] text-black':'bg-[var(--surface-2)]'}`}>⚙️ Настройки</button>
          </div>
        </div>
      </nav>
    </main>
  );
}

/* ─── Уроки ─── */
type LessonEditable = { id:number; title:string; subtitle?:string; description?:string };

function LessonsEditor() {
  const [items, setItems] = useState<LessonEditable[]>([]);
  const [snapshot, setSnapshot] = useState<LessonEditable[]>([]); // последнее сохранение

  useEffect(() => {
    const seed = () => (LESSONS as LessonMeta[]).map(l => ({
      id: l.id, title: l.title, subtitle: l.subtitle || '', description: l.description || '',
    }));
    try {
      const raw = localStorage.getItem('admin_lessons');
      const arr = raw ? JSON.parse(raw) as any[] : null;
      const normalized = (arr?.length ? arr : seed()).map(l => ({
        id: Number(l.id), title: String(l.title ?? ''), subtitle: String(l.subtitle ?? ''), description: String(l.description ?? ''),
      })) as LessonEditable[];
      setItems(normalized);
      setSnapshot(normalized);
    } catch {
      const s = seed(); setItems(s); setSnapshot(s);
    }
  }, []);

  const patch = (id:number, patch:Partial<LessonEditable>) =>
    setItems(prev => prev.map(x => x.id===id ? {...x, ...patch} : x));

  const isDirty = (l:LessonEditable) => {
    const s = snapshot.find(x=>x.id===l.id);
    return !s || s.title!==l.title || (s.subtitle??'')!==(l.subtitle??'') || (s.description??'')!==(l.description??'');
  };

  const saveLesson = (id:number) => {
    setItems(prev => {
      const next = [...prev];
      localStorage.setItem('admin_lessons', JSON.stringify(next));
      const updated = next.find(x=>x.id===id)!;
      setSnapshot(s => s.map(x => x.id===id ? {...updated} : x));
      return next;
    });
  };

  const resetLesson = (id:number) => {
    setItems(prev => prev.map(x => x.id===id ? {...(snapshot.find(s=>s.id===id) as LessonEditable)} : x));
  };

  return (
    <section className="space-y-4 w-full">
      {items.map(l => {
        const dirty = isDirty(l);
        return (
          <div key={l.id} className="glass rounded-2xl p-4 w-full">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-[var(--muted)]">ID: {l.id}</div>
              <div className="flex items-center gap-2">
                <Btn variant="brand" onClick={()=>saveLesson(l.id)} disabled={!dirty}>💾 Сохранить</Btn>
                <Btn onClick={()=>resetLesson(l.id)} disabled={!dirty}>♻️ Сбросить</Btn>
              </div>
            </div>

            <label className="block text-sm font-semibold">Заголовок</label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              value={l.title}
              onChange={(e)=>patch(l.id,{title:e.target.value})}
            />

            <label className="mt-3 block text-sm font-semibold">Подзаголовок</label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              value={l.subtitle || ''}
              onChange={(e)=>patch(l.id,{subtitle:e.target.value})}
            />

            <label className="mt-3 block text-sm font-semibold">Описание</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              rows={3}
              value={l.description || ''}
              onChange={(e)=>patch(l.id,{description:e.target.value})}
            />

            <div className="mt-2 text-right text-xs text-[var(--muted)]">
              {dirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены'}
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ─── Пользователи ─── */
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

/* ─── Настройки (цитаты) ─── */
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
