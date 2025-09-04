'use client';

import React, { useEffect, useState } from 'react';
import { LESSONS, type LessonMeta } from '@/lib/lessons';
import PresenceClient, {
  readPresenceStore,
  type PresenceSession as PresenceSessionType,
} from '@/components/PresenceClient';

/* ───────────────── auth gate ───────────────── */

function useIsAdmin(): { loading: boolean; allowed: boolean; username?: string } {
  const [state, setState] = useState<{ loading: boolean; allowed: boolean; username?: string }>({
    loading: true,
    allowed: false,
    username: undefined,
  });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        // ждём появления Telegram.WebApp (до ~1 сек)
        for (let i = 0; i < 10; i++) {
          // @ts-ignore
          const wa = (window as any)?.Telegram?.WebApp;
          if (wa) {
            const u = wa?.initDataUnsafe?.user;
            const username: string | undefined = u?.username;
            const demo = new URLSearchParams(window.location.search).get('demoAdmin') === '1';
            const allowed = (username && username.toLowerCase() === 'marselv1') || demo;
            if (!cancelled) setState({ loading: false, allowed, username });
            return;
          }
          await new Promise(r => setTimeout(r, 100));
        }
      } catch {}
      if (!cancelled) setState({ loading: false, allowed: false, username: undefined });
    };

    void check();
    return () => { cancelled = true; };
  }, []);

  return state;
}

/* =========================== Admin shell =========================== */

export default function AdminPage() {
  const { loading, allowed, username } = useIsAdmin();
  const [tab, setTab] = useState<'lessons' | 'users' | 'settings'>('lessons');

  // пока проверяем телеграм — ничего не рендерим, чтобы не мигало
  if (loading) return null;

  if (!allowed) {
    return (
      <main className="mx-auto max-w-[var(--content-max)] px-4 py-10">
        <PresenceClient page="admin" activity="Админ-панель (доступ запрещён)" />
        <div className="glass rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">🔒</div>
          <h1 className="text-xl font-bold">Доступ запрещён</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Эта страница доступна только администратору <b>@marselv1</b>.
            {username ? <> Вы вошли как <b>@{username}</b>.</> : null}
          </p>
          <a href="/" className="btn mt-4">На главную</a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <PresenceClient page="admin" activity="Админ-панель" />

      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Админ-панель</h1>
        <div className="tabs">
          <button className={`tab ${tab === 'lessons' ? 'tab--active' : ''}`} onClick={() => setTab('lessons')}>
            📚 Уроки
          </button>
          <button className={`tab ${tab === 'users' ? 'tab--active' : ''}`} onClick={() => setTab('users')}>
            👥 Пользователи
          </button>
          <button className={`tab ${tab === 'settings' ? 'tab--active' : ''}`} onClick={() => setTab('settings')}>
            ⚙️ Настройки
          </button>
        </div>
      </div>

      {tab === 'lessons' && <LessonsEditor />}
      {tab === 'users' && <UsersLive />}
      {tab === 'settings' && <SettingsEditor />}

      <p className="mt-8 pb-8 text-center text-xs text-[var(--muted)]">
        admin • localStorage prototype
      </p>
    </main>
  );
}

/* ========================= Уроки — редактор ========================= */

type LessonEditable = { id: number; title: string; subtitle?: string; description?: string; };

function LessonsEditor() {
  const [items, setItems] = useState<LessonEditable[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_lessons');
      if (saved) {
        const arr = JSON.parse(saved) as unknown;
        if (Array.isArray(arr)) {
          setItems(
            (arr as any[])
              .map((l) => {
                const id = Number(l?.id);
                if (!Number.isFinite(id)) return null;
                return {
                  id,
                  title: String(l?.title ?? ''),
                  subtitle: String(l?.subtitle ?? ''),
                  description: String(l?.description ?? ''),
                } as LessonEditable;
              })
              .filter(Boolean) as LessonEditable[]
          );
        } else seedFromDefaults();
      } else seedFromDefaults();
    } catch { seedFromDefaults(); }

    function seedFromDefaults() {
      const seed: LessonEditable[] = (LESSONS as LessonMeta[]).map((l) => ({
        id: l.id,
        title: l.title,
        subtitle: l.subtitle || '',
        description: l.description || '',
      }));
      setItems(seed);
    }
  }, []);

  const patch = (id: number, patch: Partial<LessonEditable>) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const save = () => {
    try { localStorage.setItem('admin_lessons', JSON.stringify(items)); alert('✅ Уроки сохранены'); } catch {}
  };

  const reset = () => {
    try {
      localStorage.removeItem('admin_lessons');
      const seed: LessonEditable[] = (LESSONS as LessonMeta[]).map((l) => ({
        id: l.id, title: l.title, subtitle: l.subtitle || '', description: l.description || '',
      }));
      setItems(seed);
      alert('♻️ Сброшено к дефолтам');
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="btn--outline" onClick={save}>💾 Сохранить</button>
        <button className="btn" onClick={reset}>♻️ Сбросить</button>
      </div>

      <div className="grid gap-4">
        {items.map((l) => (
          <div key={l.id} className="glass rounded-xl p-4">
            <div className="mb-2 text-sm text-[var(--muted)]">ID: {l.id}</div>

            <label className="block text-sm font-semibold">Заголовок</label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              value={l.title}
              onChange={(e) => patch(l.id, { title: e.target.value })}
            />

            <label className="mt-3 block text-sm font-semibold">Подзаголовок</label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              value={l.subtitle || ''}
              onChange={(e) => patch(l.id, { subtitle: e.target.value })}
            />

            <label className="mt-3 block text-sm font-semibold">Описание</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              rows={3}
              value={l.description || ''}
              onChange={(e) => patch(l.id, { description: e.target.value })}
            />

            <div className="mt-3 text-right text-xs text-[var(--muted)]">Сохраняется через «💾 Сохранить»</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====================== Пользователи — онлайн ====================== */

function UsersLive() {
  const [sessions, setSessions] = useState<PresenceSessionType[]>([]);

  useEffect(() => {
    const load = () => setSessions(readPresenceStore());
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const onlineNow = sessions.filter((s) => s.isOnline).length;
  const totalUnique = new Set(sessions.map((s) => s.uid)).size;

  return (
    <div className="space-y-4">
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
          <div className="text-sm text-[var(--muted)]">Сессий сохранено</div>
          <div className="text-2xl font-bold">{sessions.length}</div>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="mb-3 text-lg font-bold">Список сессий</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="px-2 py-2">UID</th>
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
              {sessions.length === 0 && (
                <tr>
                  <td className="px-2 py-2 text-[var(--muted)]" colSpan={8}>
                    Пусто. Откройте приложение в соседней вкладке, чтобы появился пользователь.
                  </td>
                </tr>
              )}
              {sessions.map((s) => (
                <tr key={s.uid + '-' + s.updatedAt} className="border-t border-[var(--border)]">
                  <td className="px-2 py-2">{s.uid.slice(0, 6)}…</td>
                  <td className="px-2 py-2">{s.username ?? '—'}</td>
                  <td className="px-2 py-2">{s.page}</td>
                  <td className="px-2 py-2">{s.activity ?? '—'}</td>
                  <td className="px-2 py-2">{s.lessonId ?? '—'}</td>
                  <td className="px-2 py-2">{s.progressPct !== undefined ? `${s.progressPct}%` : '—'}</td>
                  <td className="px-2 py-2">{s.isOnline ? '🟢' : '⚪️'}</td>
                  <td className="px-2 py-2">{new Date(s.updatedAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-[var(--muted)]">
          * Прототип: данные пишет каждый клиент в свой <code>localStorage</code>.
          Для продакшна заменить на БД + вебсокеты.
        </div>
      </div>
    </div>
  );
}

/* ======================== Настройки (цитаты) ======================== */

function SettingsEditor() {
  const [quotes, setQuotes] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('admin_quotes');
      if (raw) {
        const arr = JSON.parse(raw) as unknown;
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

  const add = () => setQuotes((q) => [...q, 'Новая цитата…']);
  const patch = (i: number, val: string) => setQuotes((q) => q.map((x, idx) => (i === idx ? val : x)));
  const del = (i: number) => setQuotes((q) => q.filter((_, idx) => i !== idx));
  const save = () => {
    try { localStorage.setItem('admin_quotes', JSON.stringify(quotes)); alert('✅ Цитаты сохранены'); } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="btn--outline" onClick={save}>💾 Сохранить</button>
        <button className="btn" onClick={add}>➕ Добавить</button>
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
              <button className="btn" onClick={() => del(i)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
