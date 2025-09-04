'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Заголовки (замените на свои при необходимости) */
const TITLES: Record<number, string> = {
  1: 'Крипта простыми словами',
  2: 'Арбитраж: как это работает',
  3: 'Риски, мифы и страхи',
  4: 'Главные ошибки новичков',
  5: 'Итог: как двигаться дальше',
  6: 'Дополнительные материалы',
};

type TabKey = 'desc' | 'test' | 'materials';

export default function LessonPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id ?? 1);

  const [tab, setTab] = useState<TabKey>('desc');

  const title = useMemo(() => TITLES[id] || `Урок ${id}`, [id]);

  const goHome = () => router.push('/');
  const goBack  = () => router.back();
  const goNext  = () => router.push(`/lesson/${id + 1}`);
  const goPrev  = () => router.push(`/lesson/${Math.max(1, id - 1)}`);

  /** Сколько колонок в нижнем ряду действий */
  const actionCols = id > 1 ? 4 : 3;

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-4">

      {/* ======== TOP BAR: [назад] [ЗАГОЛОВОК] [на главную] ======== */}
      <header className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm text-[var(--fg)]/85 hover:text-[var(--fg)]"
          aria-label="Назад"
        >
          <span className="text-lg leading-none">←</span>
          <span>Назад</span>
        </button>

        <h1 className="text-center text-xl sm:text-2xl font-extrabold tracking-tight truncate px-2">
          {title}
        </h1>

        <button
          onClick={goHome}
          className="text-sm text-[var(--muted)] hover:text-[var(--fg)]"
        >
          На главную
        </button>
      </header>

      {/* ======== Блок видео ======== */}
      <section className="glass rounded-[18px] p-4 mb-3">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <span>🎬</span>
          <span>Видео-урок #{id}</span>
        </div>
        <p className="mt-2 text-[13px] sm:text-sm text-[var(--muted)]">
          Здесь будет встроенный плеер (YouTube / Vimeo / файл).
        </p>

        <div className="mt-3 aspect-video w-full rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-2) 70%,transparent)] grid place-items-center text-[var(--muted)]">
          Плеер (placeholder)
        </div>
      </section>

      {/* ======== ТАБЫ — один горизонтальный ряд (скроллится при нехватке места) ======== */}
      <div
        className="
          mt-2 mb-3 inline-flex w-full overflow-x-auto whitespace-nowrap
          rounded-2xl border border-[var(--border)]
          bg-[color-mix(in_oklab,var(--surface) 85%,transparent)] p-1
          shadow-[0_6px_18px_rgba(0,0,0,.25)]
        "
      >
        {[
          { k: 'desc' as TabKey, label: 'Описание',  icon: '📝' },
          { k: 'test' as TabKey, label: 'Тест',      icon: '✅' },
          { k: 'materials' as TabKey, label: 'Материалы', icon: '📎' },
        ].map((t) => {
          const active = tab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={[
                'mx-0.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors',
                active
                  ? 'bg-[var(--brand)] text-black'
                  : 'text-[var(--fg)]/85 hover:bg-[color-mix(in_oklab,var(--surface-2) 45%,transparent)]',
              ].join(' ')}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ======== Контент табов ======== */}
      {tab === 'desc' && (
        <div className="glass rounded-[18px] p-4">
          <p className="text-[14px] text-[var(--fg)]/90 mb-2">
            Базовая терминология и что такое крипта.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[13px] text-[var(--muted)]">
            <li>Главная идея урока</li>
            <li>3–5 ключевых тезисов</li>
            <li>Что сделать после просмотра</li>
          </ul>
        </div>
      )}

      {tab === 'test' && (
        <div className="glass rounded-[18px] p-4">
          <p className="text-[14px] text-[var(--fg)]/90">
            Короткий тест по материалу: 3–5 вопросов с вариантами.
          </p>
          <p className="text-[12px] text-[var(--muted)] mt-1">Скоро 🔧</p>
        </div>
      )}

      {tab === 'materials' && (
        <div className="glass rounded-[18px] p-4">
          <p className="text-[14px] text-[var(--fg)]/90 mb-2">
            Материалы к уроку:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[13px] text-[var(--muted)]">
            <li>Ссылки на биржи и статьи</li>
            <li>Шпаргалка / PDF</li>
            <li>Чек-лист действий</li>
          </ul>
        </div>
      )}

      {/* ======== Нижний ряд действий — ВСЕГДА В РЯД ======== */}
      <div
        className="mt-4 gap-2"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${actionCols}, minmax(0,1fr))` }}
      >
        <button
          onClick={() => router.push('/')}
          className="
            inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3
            border border-[var(--border)] bg-[var(--surface)]
            shadow-[0_10px_26px_rgba(0,0,0,.25)]
            hover:brightness-105 active:translate-y-[1px]
            text-[14px] font-semibold
          "
        >
          <span>📚</span>
          <span>К списку</span>
        </button>

        {id > 1 && (
          <button
            onClick={goPrev}
            className="
              inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3
              border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-2) 70%,transparent)]
              shadow-[0_10px_26px_rgba(0,0,0,.25)]
              hover:brightness-105 active:translate-y-[1px]
              text-[14px] font-semibold
            "
          >
            <span>⬅️</span>
            <span>Предыд.</span>
          </button>
        )}

        <button
          onClick={goNext}
          className="
            inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3
            bg-[var(--brand)] text-black
            shadow-[0_10px_26px_rgba(0,0,0,.25)]
            hover:brightness-105 active:translate-y-[1px]
            text-[14px] font-extrabold
          "
        >
          <span>➡️</span>
          <span>Следующий</span>
        </button>

        <button
          onClick={() => alert('Отметили как пройдено ✓')}
          className="
            inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3
            border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-2) 70%,transparent)]
            shadow-[0_10px_26px_rgba(0,0,0,.25)]
            hover:brightness-105 active:translate-y-[1px]
            text-[14px] font-semibold
          "
        >
          <span>✅</span>
          <span>Пройдено</span>
        </button>
      </div>

      <div className="h-24" />
    </main>
  );
}
