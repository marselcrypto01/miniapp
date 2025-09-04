'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserProgress, saveUserProgress } from '@/lib/db';

const CORE_LESSONS_COUNT = 5;

type Progress = { lesson_id: number; status: 'completed' | 'pending' };

export default function LessonPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id || 1);

  const [active, setActive] = useState<'desc' | 'test' | 'materials'>('desc');
  const [progress, setProgress] = useState<Progress[]>([]);
  const isCompleted = useMemo(
    () => progress.find(p => p.lesson_id === id)?.status === 'completed',
    [progress, id]
  );

  // load progress (LS / DB)
  useEffect(() => {
    (async () => {
      try {
        const uid = (typeof localStorage !== 'undefined' && localStorage.getItem('presence_uid')) || 'anonymous';
        const rows = await getUserProgress(uid);
        if (rows?.length) {
          setProgress(rows.map((r: any) => ({ lesson_id: Number(r.lesson_id), status: r.status })));
        } else {
          const raw = localStorage.getItem('progress');
          if (raw) setProgress(JSON.parse(raw));
        }
      } catch {
        const raw = localStorage.getItem('progress');
        if (raw) setProgress(JSON.parse(raw));
      }
    })();
  }, []);

  const markCompleted = async () => {
    const next = [...progress.filter(p => p.lesson_id !== id), { lesson_id: id, status: 'completed' as const }];
    setProgress(next);
    try { localStorage.setItem('progress', JSON.stringify(next)); } catch {}
    try {
      const uid = (typeof localStorage !== 'undefined' && localStorage.getItem('presence_uid')) || 'anonymous';
      await saveUserProgress(uid, next);
    } catch {}
  };

  const goPrev = () => id > 1 && router.push(`/lesson/${id - 1}`);
  const goNext = () => id < CORE_LESSONS_COUNT && router.push(`/lesson/${id + 1}`);

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-4">
      {/* Top nav */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => router.back()}
          className="h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center gap-2"
        >
          <span>←</span><span className="font-semibold">Назад</span>
        </button>
        <div className="text-center grow px-2">
          <h1 className="text-lg sm:text-xl font-extrabold leading-tight truncate">
            {`Урок ${id}`}
          </h1>
        </div>
        <button
          onClick={() => router.push('/')}
          className="h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center gap-2"
        >
          <span>🏠</span><span className="font-semibold">На главную</span>
        </button>
      </div>

      {/* Video / placeholder */}
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="text-[15px] font-semibold mb-2">🎬 Видео-урок #{id}</div>
        <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface) 85%,transparent)] h-44 grid place-items-center text-[var(--muted)]">
          Плеер (placeholder)
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1">
        <div className="grid grid-cols-3 gap-1">
          {[
            { k: 'desc' as const, label: 'Описание' },
            { k: 'test' as const, label: 'Тест' },
            { k: 'materials' as const, label: 'Материалы' },
          ].map(t => {
            const activeTab = active === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setActive(t.k)}
                className={`h-10 rounded-xl font-semibold ${activeTab ? 'text-black' : 'text-[var(--fg)]'}`}
                style={{
                  background: activeTab ? 'var(--brand)' : 'var(--surface-2)',
                  border: '1px solid var(--border)',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 text-sm text-[var(--fg)]">
          {active === 'desc' && (
            <ul className="list-disc pl-5 space-y-1 text-[var(--fg)]">
              <li>Базовая терминология и что такое крипта</li>
              <li>Главная идея урока</li>
              <li>3–5 ключевых тезисов</li>
              <li>Что сделать после просмотра</li>
            </ul>
          )}
          {active === 'test' && (
            <div className="text-[var(--muted)]">Мини-тест появится здесь.</div>
          )}
          {active === 'materials' && (
            <div className="text-[var(--muted)]">Материалы и ссылки к уроку.</div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="mt-4 flex items-stretch gap-2 flex-wrap">
        <button
          onClick={() => router.push('/')}
          className="h-11 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center gap-2"
          title="К списку уроков"
        >
          <span>📚</span><span className="font-semibold">К списку</span>
        </button>

        <div className="flex-1 flex items-stretch gap-2 min-w-[220px]">
          <button
            onClick={goPrev}
            disabled={id <= 1}
            className="h-11 grow rounded-xl font-semibold disabled:opacity-50 text-black"
            style={{ background: 'var(--brand)', border: '1px solid var(--border)' }}
          >
            ← Предыдущий
          </button>
          <button
            onClick={goNext}
            disabled={id >= CORE_LESSONS_COUNT}
            className="h-11 grow rounded-xl font-semibold disabled:opacity-50 text-black"
            style={{ background: 'var(--brand)', border: '1px solid var(--border)' }}
          >
            Следующий →
          </button>
        </div>

        <div
          className="h-11 px-3 rounded-xl border flex items-center gap-2"
          style={{ background: 'color-mix(in oklab, #22c55e 25%, var(--surface) 75%)', borderColor: 'var(--border)' }}
          title={isCompleted ? 'Урок отмечен как пройден' : 'Отметить как пройденный'}
          onClick={!isCompleted ? markCompleted : undefined}
        >
          <span>✔</span>
          <span className="font-semibold">{isCompleted ? 'Пройдено' : 'Отметить'}</span>
        </div>
      </div>
    </main>
  );
}
