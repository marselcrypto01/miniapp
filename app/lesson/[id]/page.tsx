'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CORE_LESSON_COUNT, getLessonById } from '@/lib/lessons';
import PresenceClient from '@/components/PresenceClient';

type LessonStatus = 'completed' | 'pending';
type Progress = { lesson_id: number; status: LessonStatus };

export default function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();

  // Next.js 15: params — Promise
  const { id } = use(params);
  const idNum = Number(id);

  const lesson = getLessonById(idNum);

  if (!lesson) {
    return (
      <main className="mx-auto max-w-xl px-4 py-5">
        <h1 className="text-2xl font-bold">Урок не найден</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Проверь номер урока.</p>
        <Link href="/" className="btn-brand mt-4 inline-block">
          ← На главную
        </Link>
      </main>
    );
  }

  // вкладки
  const [tab, setTab] = useState<'desc' | 'test' | 'materials'>('desc');

  // прогресс
  const [progress, setProgress] = useState<Progress[]>([]);
  const isCompleted = useMemo(
    () => progress.find((p) => p.lesson_id === idNum)?.status === 'completed',
    [progress, idNum]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem('progress');
      if (saved) {
        const parsed: Progress[] = JSON.parse(saved);
        setProgress(parsed);
      }
    } catch {}
  }, []);

  const markCompleted = () => {
    setProgress((prev: Progress[]): Progress[] => {
      const exists = prev.find((p) => p.lesson_id === idNum);
      const next: Progress[] = exists
        ? prev.map((p) =>
            p.lesson_id === idNum ? { ...p, status: 'completed' as LessonStatus } : p
          )
        : [...prev, { lesson_id: idNum, status: 'completed' as LessonStatus }];

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

  const prevId = idNum > 1 ? idNum - 1 : null;
  const nextId = idNum < 6 ? idNum + 1 : null;

  return (
    <main className="mx-auto max-w-xl px-4 py-5">
      {/* ✅ Presence: пишем, что пользователь на уроке, с текущей вкладкой */}
      <PresenceClient
        page="lesson"
        lessonId={idNum}
        activity={`Урок #${idNum} | вкладка: ${tab}`}
      />

      {/* ШАПКА */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            aria-label="Назад"
          >
            ← Назад
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {lesson.title}
            </h1>
            {lesson.subtitle && (
              <div className="mt-1 text-sm text-[var(--muted)]">
                {lesson.subtitle}
              </div>
            )}
          </div>
        </div>
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          На главную
        </Link>
      </div>

      {/* ВИДЕО (заглушка; сюда потом вставишь iframe/плеер на lesson.videoUrl) */}
      <div className="glass overflow-hidden rounded-[18px]">
        <div className="aspect-video grid place-items-center text-[var(--muted)]">
          <div className="text-center">
            <div className="text-lg font-semibold">🎬 Видео-урок #{idNum}</div>
            <div className="mt-1 text-sm">
              Здесь будет встроенный плеер (YouTube/Vimeo/файл)
            </div>
          </div>
        </div>
      </div>

      {/* ТАБЫ */}
      <div className="mt-4">
        <div className="tabs">
          <button
            className={`tab ${tab === 'desc' ? 'tab--active' : ''}`}
            onClick={() => setTab('desc')}
          >
            📝 Описание
          </button>
          {lesson.hasTest !== false && (
            <button
              className={`tab ${tab === 'test' ? 'tab--active' : ''}`}
              onClick={() => setTab('test')}
            >
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

        {/* Контент табов */}
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

          {tab === 'test' && lesson.hasTest !== false && (
            <div className="space-y-2 text-sm text-[var(--muted)]">
              <p>Мини-тест по уроку #{idNum}. Пока заглушка:</p>
              <ol className="list-decimal pl-5">
                <li>Вопрос 1 — вариант А/Б/В</li>
                <li>Вопрос 2 — вариант А/Б/В</li>
                <li>Вопрос 3 — вариант А/Б/В</li>
              </ol>
              <button
                className="btn-brand mt-2"
                onClick={() =>
                  alert('Тест — заглушка. Скоро добавим проверку ответов.')
                }
              >
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
              <button
                className="btn-brand mt-2"
                onClick={() => alert('Откроем материалы в боте/стораже позже')}
              >
                Открыть в боте
              </button>
            </div>
          )}
        </div>
      </div>

      {/* КНОПКИ ДЕЙСТВИЙ */}
      <div className="mt-6 flex flex-col gap-3">
        <div>
          {!isCompleted ? (
            <button className="btn-brand w-full" onClick={markCompleted}>
              ✅ Отметить как пройдено
            </button>
          ) : (
            <button
              className="btn-brand w-full cursor-default opacity-80"
              disabled
            >
              🎉 Пройдено
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {prevId ? (
            <button
              className="glass rounded-xl px-3 py-2 flex items-center justify-center hover:-translate-y-[2px] transition"
              onClick={() => router.push(`/lesson/${prevId}`)}
            >
              ← Предыдущий
            </button>
          ) : (
            <div />
          )}

          <button
            className="glass rounded-xl px-3 py-2 flex items-center justify-center hover:-translate-y-[2px] transition"
            onClick={() => router.push('/')}
          >
            📚 К урокам
          </button>

          {nextId ? (
            <button
              className="glass rounded-xl px-3 py-2 flex items-center justify-center hover:-translate-y-[2px] transition"
              onClick={() => router.push(`/lesson/${nextId}`)}
            >
              Следующий →
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>

      <p className="mt-6 pb-24 text-center text-xs text-[var(--muted)]">
        @your_bot
      </p>
    </main>
  );
}
