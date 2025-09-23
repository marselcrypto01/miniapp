'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { initSupabaseFromTelegram } from '@/lib/db';

const WRAP = 'mx-auto max-w-[var(--content-max)] px-4';
const CORE_LESSONS_COUNT = 5;
const REQUIRED_POINTS = 500;

/* === user-scoped localStorage namespace — как на уроках === */
function getTgIdSync(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wa = (window as any)?.Telegram?.WebApp;
    const id = wa?.initDataUnsafe?.user?.id;
    return (id ?? null)?.toString?.() ?? null;
  } catch {
    return null;
  }
}
function ns(key: string): string {
  const id = getTgIdSync();
  return id ? `${key}:tg_${id}` : `${key}:anon`;
}

type Progress = { lesson_id: number; status: 'completed' | 'pending' };

/** Сколько уроков завершено локально (как на странице уроков) */
function getLocalCompletedCount(): number {
  try {
    const raw = localStorage.getItem(ns('progress'));
    const arr: Progress[] = raw ? JSON.parse(raw) : [];
    return (Array.isArray(arr) ? arr : []).filter(
      (p) => p.status === 'completed' && p.lesson_id <= CORE_LESSONS_COUNT
    ).length;
  } catch {
    return 0;
  }
}

/** Очки из локального стора (должны устанавливаться на главной) */
function getLocalPoints(): number {
  try {
    const raw = localStorage.getItem(ns('points'));
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export default function BonusPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = React.useState(false);
  const [allowed, setAllowed] = React.useState<boolean | null>(null);
  const [stateView, setStateView] = React.useState<{completed:number; points:number}>({completed:0, points:0});

  // Telegram/Supabase init (как на уроках)
  React.useEffect(() => {
    let off = false;
    (async () => {
      try {
        await initSupabaseFromTelegram();
      } catch {
        // тихо — офлайн ок
      } finally {
        if (!off) setAuthReady(true);
      }
    })();
    return () => { off = true; };
  }, []);

  // Решаем, пускать ли на страницу:
  // условие доступа: (все 5 уроков пройдены) ИЛИ (points >= REQUIRED_POINTS)
  React.useEffect(() => {
    const completed = getLocalCompletedCount();
    const points    = getLocalPoints();
    setStateView({completed, points});
    setAllowed(completed >= CORE_LESSONS_COUNT || points >= REQUIRED_POINTS);
  }, [authReady]);

  const SectionCard: React.FC<
    React.PropsWithChildren<{ title: string; icon?: string; muted?: boolean }>
  > = ({ title, icon, children, muted }) => (
    <div
      className={`rounded-2xl border border-[var(--border)] p-4 ${
        muted ? 'bg-[var(--surface-2)]' : 'bg-[var(--surface)]'
      }`}
    >
      <div className="text-[15px] font-semibold mb-2 flex items-center gap-2">
        {icon ? <span className="text-base">{icon}</span> : null}
        <span>{title}</span>
      </div>
      <div className="text-[14px] leading-relaxed">{children}</div>
    </div>
  );

  const Pill: React.FC<React.PropsWithChildren> = ({ children }) => (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--bg)] text-[12px] mr-2 mb-2">
      {children}
    </span>
  );

  const BonusContent = () => (
    <section className="space-y-4">
      {/* Заголовок */}
      <header className="mb-1">
        <h1 className="text-2xl font-extrabold tracking-tight leading-[1.1]">
          🎁 Бонус-материал: стартовый набор для P2P
        </h1>
        <div className="mt-2 h-[3px] w-24 rounded bg-[var(--brand)]" />
      </header>

      {/* Вступление */}
      <SectionCard title="Поздравляю!" icon="✨">
        <p>
          Ты прошёл мини-курс до конца — отличный фундамент. Ниже&nbsp;— выжимка того, что поможет
          быстро и безопасно сделать первые шаги в P2P: где работать, через какие банки, и в каком
          порядке действовать.
        </p>
      </SectionCard>

      {/* Биржи */}
      <SectionCard title="Рекомендованные площадки" icon="🏦">
        <p className="mb-2 text-[13px] text-[var(--muted)]">
          Начинай с проверенных платформ. Они удобны для новичков и дают достаточную ликвидность.
        </p>
        <div className="flex flex-wrap">
          <Pill>BingX</Pill>
          <Pill>MEXC</Pill>
          <Pill>Telegram Wallet (TON)</Pill>
        </div>
      </SectionCard>

      {/* Банки */}
      <SectionCard title="Актуальные банки для работы" icon="💳">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Альфа-Банк</li>
          <li>Ozon</li>
          <li>Т-Банк</li>
          <li>Сбербанк</li>
          <li>Яндекс</li>
          <li>ОТП</li>
          <li>ПСБ</li>
          <li>ВТБ / Райффайзен</li>
          <li>Совком</li>
          <li>МКБ</li>
        </ol>
        <p className="mt-2 text-[13px] text-[var(--muted)]">
          Под конкретные пары/город выбирай банки с лучшими лимитами и скоростью зачислений.
        </p>
      </SectionCard>

      {/* Мини-гайд */}
      <SectionCard title="Быстрый план действий" icon="🚀">
        <ul className="list-disc pl-5 space-y-1">
          <li>Создай аккаунт на одной из бирж и пройди базовую верификацию.</li>
          <li>Добавь рабочие карты выбранных банков.</li>
          <li>Открой P2P-раздел и посмотри стакан цен на покупку/продажу USDT.</li>
          <li>Сделай тестовую мини-сделку на безопасную сумму, чтобы потренироваться.</li>
          <li>Веди журнал: банк, сумма, курс, маржа, время — так быстрее выйдешь на стабильность.</li>
        </ul>
      </SectionCard>

      {/* Безопасность */}
      <SectionCard title="Безопасность и здравый смысл" icon="🛡️" muted>
        <ul className="list-disc pl-5 space-y-1">
          <li>Работай только в рамках правил биржи и банков — без серых схем.</li>
          <li>Проверяй имя отправителя и назначение платежа перед подтверждением сделки.</li>
          <li>Держи резерв на комиссии и возможные задержки.</li>
          <li>Не спеши: лучше меньше оборот, чем лишний риск.</li>
        </ul>
      </SectionCard>

      {/* CTA */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => router.push('/lesson/1')}
          className="h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)] font-semibold"
          title="Вернуться к урокам"
        >
          ← К урокам
        </button>
        <button
          onClick={() => router.push('/')}
          className="h-11 rounded-xl bg-[var(--brand)] text-black font-semibold border border-[var(--border)]"
          title="На главную"
        >
          На главную
        </button>
      </div>
    </section>
  );

  const Locked = () => (
    <section className="glass p-6 rounded-2xl w-full text-center">
      <div className="text-2xl mb-2">🔒 Бонус откроется после курса или при {REQUIRED_POINTS}+ очков</div>
      <p className="text-[14px] text-[var(--muted)] mb-4">
        Прогресс: {stateView.completed}/{CORE_LESSONS_COUNT} уроков · Очки: {stateView.points} / {REQUIRED_POINTS}
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => router.push('/lesson/1')}
          className="h-11 px-4 rounded-xl bg-[var(--brand)] text-black font-semibold border border-[var(--border)]"
        >
          Перейти к урокам
        </button>
      </div>
    </section>
  );

  return (
    <main className={`${WRAP} py-4`}>
      {allowed === null ? (
        <div className="text-center text-[var(--muted)]">Проверяем доступ…</div>
      ) : allowed ? (
        <BonusContent />
      ) : (
        <Locked />
      )}
      <div className="pb-24" />
    </main>
  );
}
