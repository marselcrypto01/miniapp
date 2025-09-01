'use client';

import React, { useEffect, useMemo, useState, use as usePromise } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PresenceClient from '@/components/PresenceClient';
import { CORE_LESSON_COUNT, getLessonById } from '@/lib/lessons';

type Progress = { lesson_id: number; status: 'completed' | 'pending' };

export default function LessonPage(props: { params: Promise<{ id: string }> }) {
  const router = useRouter();

  // В Next 15 params — это Promise, разворачиваем через React.use()
  const { id } = usePromise(props.params);
  const idNum = Number(id);

  // хуки ВСЕГДА сверху (чтобы не было ошибки «hooks called conditionally»)
  const [tab, setTab] = useState<'desc' | 'test' | 'materials'>('desc');
  const [progress, setProgress] = useState<Progress[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('progress');
      if (saved) setProgress(JSON.parse(saved));
    } catch {}
  }, []);

  const isCompleted = useMemo(
    () => progress.find((p) => p.lesson_id === idNum)?.status === 'completed',
    [progress, idNum]
  );

  const markCompleted = () => {
    setProgress((prev) => {
      const exists = prev.find((p) => p.lesson_id === idNum);
      const next = exists
        ? prev.map((p) => (p.lesson_id === idNum ? { ...p, status: 'completed' } : p))
        : [...prev, { lesson_id: idNum, status: 'completed' }];

      try {
        localStorage.setItem('progress', JSON.stringify(next));
        const coreCompleted = next.filter(
          (p) => p.status === 'completed' && p.lesson_id <= CORE_LESSON_COUNT
        ).length;
        localStorage.setItem(
          'all_completed',
          coreCompleted >= CORE_LESSON_COUNT ? 'true' : 'false'
        );
      } catch {}
      return next;
    });
    alert('✅ Урок отмечен как пройденный');
  };

  const lesson = getLessonById(idNum);
  const prevId = idNum > 1 ? idNum - 1 : null;
  const nextId = idNum < 6 ? idNum + 1 : null;

  if (!lesson || Number.isNaN(idNum)) {
    return (
      <main className="mx-auto max-w-xl px-4 py-5">
        <h1 className="text-2xl font-bold">Урок не найден</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Проверь номер урока.</p>
        <Link href="/" className="btn-brand mt-4 inline-block">← На главную</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-5">
      <PresenceClient page="lesson" lessonId={idNum} activity={`Урок #${idNum} | вкладка: ${tab}`} />

      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          >
            ← Назад
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{lesson.title}</h1>
            {lesson.subtitle && (
              <div className="mt-1 text-sm text-[var(--muted)]">{lesson.subtitle}</div>
            )}
          </div>
        </div>

        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          На главную
        </Link>
      </div>

      <div className="glass overflow-hidden rounded-[18px]">
        <div className="aspect-video grid place-items-center text-[var(--muted)]">
          <div className="text-center">
            <div className="text-lg font-semibold">🎬 Видео-урок #{idNum}</div>
            <div className="mt-1 text-sm">Здесь будет встроенный плеер (YouTube/Vimeo/файл)</div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="tabs">
          <button className={`tab ${tab === 'desc' ? 'tab--active' : ''}`} onClick={() => setTab('desc')}>
            📝 Описание
          </button>
          {lesson.hasTest && (
            <button className={`tab ${tab === 'test' ? 'tab--active' : ''}`} onClick={() => setTab('test')}>
              ✅ Тест
            </button>
          )}
          <button
            className={`tab ${tab === 'materials' ? 'tab--active' : ''}`}
            onClick={() => setTab('materials')}
          >
            📎 Материалы
          </button>
        </div>

        <div className="mt-3 glass rounded-[18px] p-4">
          {tab === 'desc' && (
            <div className="space-y-2 text-sm text-[var(--muted)]">
              <p>{lesson.description || `Краткое описание урока #${idNum}.`}</p>
              <ul className="list-disc pl-5">
                <li>Главная идея урока</li>
                <li>3–5 ключевых тезисов</li>
                <li>Что сделать после просмотра</li>
              </ul>
            </div>
          )}

          {tab === 'test' && lesson.hasTest && (
            <div className="space-y-2 text-sm text-[var(--muted)]">
              <p>Мини-тест по уроку #{idNum}. Пока заглушка:</p>
              <ol className="list-decimal pl-5">
                <li>Вопрос 1 — вариант А/Б/В</li>
                <li>Вопрос 2 — вариант А/Б/В</li>
                <li>Вопрос 3 — вариант А/Б/В</li>
              </ol>
              <button className="btn-brand mt-2" onClick={() => alert('Тест — заглушка.')}>
                Отправить ответы
              </button>
            </div>
          )}

          {tab === 'materials' && (
            <div className="space-y-2 text-sm text-[var(--muted)]">
              <p>Полезные материалы к уроку #{idNum}:</p>
              <ul className="list-disc pl-5">
                <li>PDF/чек-лист — заглушка</li>
                <li>Ссылки на сервисы — заглушка</li>
                <li>Шаблоны — заглушка</li>
              </ul>
              <button className="btn-brand mt-2" onClick={() => alert('Откроем материалы в боте')}>
                Открыть в боте
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!isCompleted ? (
          <button className="btn-brand" onClick={markCompleted}>Отметить как пройдено</button>
        ) : (
          <button className="btn-brand cursor-default opacity-80" disabled>Пройдено</button>
        )}

        {prevId && <button className="btn" onClick={() => router.push(`/lesson/${prevId}`)}>← Предыдущий</button>}
        {nextId && <button className="btn" onClick={() => router.push(`/lesson/${nextId}`)}>Следующий →</button>}
        <button className="btn" onClick={() => router.push('/')}>К списку уроков</button>
      </div>

      <p className="mt-6 pb-24 text-center text-xs text-[var(--muted)]">@your_bot</p>
    </main>
  );
}
