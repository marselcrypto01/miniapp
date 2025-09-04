'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

// простая мапа заголовков (замените на ваши данные при необходимости)
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

  const goBack = () => router.back();
  const goHome = () => router.push('/');
  const goNext = () => router.push(`/lesson/${id + 1}`);

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-4">
      {/* ====== верхняя панель ====== */}
      <header className="relative mb-4">
        {/* левая кнопка «назад» */}
        <button
          onClick={goBack}
          className="absolute left-0 top-1.5 inline-flex items-center gap-2 text-[var(--fg)]/85 hover:text-[var(--fg)]"
        >
          <span className="text-lg">←</span>
          <span className="text-sm">Назад</span>
        </button>

        {/* по центру — название урока */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {title}
          </h1>
        </div>

        {/* справа — на главную */}
        <button
          onClick={goHome}
          className="absolute right-0 top-1.5 text-sm text-[var(--muted)] hover:text-[var(--fg)]"
        >
          На главную
        </button>
      </header>

      {/* ====== блок видео/контента ====== */}
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

      {/* ====== компактные табы ====== */}
      <div
        className="
          mt-2 mb-3 inline-flex rounded-2xl border border-[var(--border)]
          bg-[color-mix(in_oklab,var(--surface) 85%,transparent)] p-1 shadow-[0_6px_18px_rgba(0,0,0,.25)]
        "
      >
        {[
          { k: 'desc' as TabKey, label: 'Описание', icon: '📝' },
          { k: 'test' as TabKey, label: 'Тест', icon: '✅' },
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

      {/* ====== контент табов ====== */}
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

      {/* ====== блок действий (кнопки) ====== */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          onClick={() => router.push('/')}
          className="
            inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3
            border border-[var(--border)] bg-[var(--surface)]
            shadow-[0_10px_26px_rgba(0,0,0,.25)]
            hover:brightness-105 active:translate-y-[1px]
            text-[15px] font-semibold
          "
        >
          <span>📚</span>
          <span>К списку уроков</span>
        </button>

        <button
          onClick={goNext}
          className="
            inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3
            bg-[var(--brand)] text-black
            shadow-[0_10px_26px_rgba(0,0,0,.25)]
            hover:brightness-105 active:translate-y-[1px]
            text-[15px] font-extrabold
          "
        >
          <span>➡️</span>
          <span>Следующий</span>
        </button>

        <button
          onClick={() => alert('Отметили как пройдено ✓')}
          className="
            inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3
            border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface-2) 70%,transparent)]
            shadow-[0_10px_26px_rgba(0,0,0,.25)]
            hover:brightness-105 active:translate-y-[1px]
            text-[15px] font-semibold
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
