// app/lesson/[id]/page.tsx
'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PresenceClient from '@/components/PresenceClient';
import { getLessonById } from '@/lib/lessons';
import { getUserProgress, saveUserProgress } from '@/lib/db';

type Progress = { lesson_id: number; status: 'completed' | 'pending' };
type TabKey = 'desc' | 'test' | 'materials';

// тот же uid, что использует PresenceClient/Home
const UID_KEY = 'presence_uid';
function getClientUid(): string {
  try {
    let uid = localStorage.getItem(UID_KEY);
    if (!uid) {
      uid =
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(UID_KEY, uid);
    }
    return uid;
  } catch {
    return 'anonymous';
  }
}

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // Next 15: params — Promise
  const idNum = Number(id);

  const meta = getLessonById(idNum);
  const hasTest = !!meta?.hasTest;

  const tabs = useMemo<TabKey[]>(
    () => (hasTest ? ['desc', 'test', 'materials'] : ['desc', 'materials']),
    [hasTest]
  );

  const [tab, setTab] = useState<TabKey>('desc');
  const [progress, setProgress] = useState<Progress[]>([]);
  const [saving, setSaving] = useState(false);

  // строгий parse из LS
  function readProgressLS(): Progress[] {
    try {
      const raw = localStorage.getItem('progress');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr
        .map((r: any) => {
          const lesson_id = Number(r?.lesson_id);
          const status: Progress['status'] = r?.status === 'completed' ? 'completed' : 'pending';
          return Number.isFinite(lesson_id) ? { lesson_id, status } : null;
        })
        .filter(Boolean) as Progress[];
    } catch {
      return [];
    }
  }

  // Загрузка прогресса: сначала из БД, иначе — из LS
  useEffect(() => {
    const uid = getClientUid();
    (async () => {
      try {
        const rows = await getUserProgress(uid);
        if (rows && rows.length) {
          const arr: Progress[] = rows.map((r) => ({
            lesson_id: Number(r.lesson_id),
            status: r.status === 'completed' ? 'completed' : 'pending',
          }));
          setProgress(arr);
          try {
            localStorage.setItem('progress', JSON.stringify(arr));
          } catch {}
          return;
        }
      } catch {
        // ignore
      }
      setProgress(readProgressLS());
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idNum]);

  const isCompleted = progress.some((p) => p.lesson_id === idNum && p.status === 'completed');

  // Отметить как пройдено (LS + БД, без повторного чтения из LS)
  const markCompleted = async () => {
    const uid = getClientUid();

    let next: Progress[] = [];
    setProgress((prev) => {
      const exists = prev.find((p) => p.lesson_id === idNum);
      next = exists
        ? prev.map((p) => (p.lesson_id === idNum ? { ...p, status: 'completed' as const } : p))
        : [...prev, { lesson_id: idNum, status: 'completed' as const }];

      try {
        localStorage.setItem('progress', JSON.stringify(next));
      } catch {}
      return next;
    });

    setSaving(true);
    try {
      await saveUserProgress(uid, next);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('save progress error', e);
    } finally {
      setSaving(false);
    }
  };

  // соседние уроки
  const prevId = idNum > 1 ? idNum - 1 : null;
  const nextId = idNum < 6 ? idNum + 1 : null;

  if (!meta) {
    return (
      <main className="mx-auto max-w-xl px-4 py-8">
        <div className="glass rounded-xl p-6">Урок не найден</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-5">
      <PresenceClient page="lesson" lessonId={idNum} activity={`Урок #${idNum} | вкладка: ${tab}`} />

      <div className="mb-3 flex items-center justify-between">
        <Link href="/" className="btn--outline">← Назад</Link>
        <div className="text-xl font-extrabold">{meta.title}</div>
        <Link href="/" className="text-sm text-[var(--muted)]">На главную</Link>
      </div>

      {/* Видео */}
      <div className="glass rounded-xl p-6 text-center">
        <div className="text-lg font-semibold">🎬 Видео-урок #{idNum}</div>
        <div className="mt-2 text-sm text-[var(--muted)]">Здесь будет встроенный плеер (YouTube/Vimeo/файл)</div>
      </div>

      {/* Табы */}
      <div className="mt-3 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? 'tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'desc' && '📝 Описание'}
            {t === 'test' && '✅ Тест'}
            {t === 'materials' && '📎 Материалы'}
          </button>
        ))}
      </div>

      {/* Контент вкладок */}
      <div className="mt-3 glass rounded-xl p-4">
        {tab === 'desc' && (
          <div className="space-y-2">
            <div className="text-sm text-[var(--muted)]">{meta.description || 'Описание урока'}</div>
            <ul className="list-disc pl-5 text-sm">
              <li>Главная идея урока</li>
              <li>3–5 ключевых тезисов</li>
              <li>Что сделать после просмотра</li>
            </ul>
          </div>
        )}

        {tab === 'test' && hasTest && (
          <div className="space-y-2">
            <div className="text-sm text-[var(--muted)]">Мини-тест (заглушка)</div>
            <button className="btn-brand" onClick={markCompleted} disabled={saving || isCompleted}>
              {isCompleted ? 'Пройдено' : saving ? 'Сохранение…' : 'Отметить как пройдено'}
            </button>
          </div>
        )}

        {tab === 'materials' && (
          <div className="text-sm text-[var(--muted)]">Ссылки, чек-листы, PDF — добавим позже</div>
        )}
      </div>

      {/* Нижняя панель — «красивые ячейки» */}
      <div className="mt-4 glass rounded-xl p-3 flex items-center justify-between">
        <Link href="/" className="btn--ghost">К списку уроков</Link>

        <div className="flex gap-2">
          {prevId && (
            <Link className="btn--outline" href={`/lesson/${prevId}`}>
              ← Предыдущий
            </Link>
          )}
          {nextId && (
            <Link className="btn" href={`/lesson/${nextId}`}>
              Следующий →
            </Link>
          )}
        </div>

        <button
          className={`btn ${isCompleted ? 'opacity-70 cursor-default' : ''}`}
          onClick={markCompleted}
          disabled={isCompleted || saving}
          title={isCompleted ? 'Урок уже отмечен' : 'Отметить урок как пройденный'}
        >
          {isCompleted ? 'Пройдено' : saving ? 'Сохранение…' : 'Отметить пройдено'}
        </button>
      </div>
    </main>
  );
}
