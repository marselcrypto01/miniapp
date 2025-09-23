'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { initSupabaseFromTelegram } from '@/lib/db';

const WRAP = 'mx-auto max-w-[var(--content-max)] px-4';
const CORE_LESSONS_COUNT = 5;
const REQUIRED_POINTS = 500;

/** ВСТАВЬ СВОИ РЕФ-ССЫЛКИ ЗДЕСЬ */
const EXCHANGES: Array<{ label: string; href: string }> = [
  { label: 'BingX', href: 'https://bingx.com/' },
  { label: 'MEXC', href: 'https://www.mexc.com/' },
  { label: 'Telegram Wallet (TON)', href: '' },
];

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

  React.useEffect(() => {
    let off = false;
    (async () => {
      try {
        await initSupabaseFromTelegram();
      } catch {
      } finally {
        if (!off) setAuthReady(true);
      }
    })();
    return () => { off = true; };
  }, []);

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

  const LinkPill: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--bg)] text-[12px] mr-2 mb-2 hover:opacity-90 active:translate-y-[1px]"
    >
      {children} <span className="ml-1">↗</span>
    </a>
  );

  const BonusContent = () => (
    <section className="space-y-4">
      <header className="mb-1">
        <h1 className="text-2xl font-extrabold tracking-tight leading-[1.1]">
          🎁 Бонус-материал: стартовый набор для заработка на криптовалюте
        </h1>
        <div className="mt-2 h-[3px] w-24 rounded bg-[var(--brand)]" />
      </header>

      <SectionCard title="Поздравляю!" icon="✨">
      <p>
        Ты прошёл мини-курс до конца — <b>отличный фундамент</b>.  
        Ниже — <i>выжимка</i> того, что поможет быстро и безопасно сделать <b>первые шаги в P2P</b>:  
        где работать, через какие банки, и в каком порядке действовать.
      </p>

      </SectionCard>

      {/* Рекомендованные площадки — ТЕПЕРЬ КАК ССЫЛКИ */}
      <SectionCard title="Рекомендованные биржи" icon="🏦">
        <p className="mb-2 text-[13px] text-[var(--muted)]">
          Начинай с проверенных бирж. Они удобны для новичков и на них можно хорошо заработать.
        </p>
        <div className="flex flex-wrap">
          {EXCHANGES.map((x) => (
            <LinkPill key={x.label} href={x.href}>
              {x.label}
            </LinkPill>
          ))}
        </div>
      </SectionCard>

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
          Это лучшие банки для работы в P2P-арбитраже на конец сентября 2025 года.
        </p>
      </SectionCard>

      <SectionCard title="Пошаговый план работы в P2P-арбитраже" icon="🚀">
        <ul className="list-disc pl-5 space-y-1">
        <li><b>Подготовка.</b> Пройди <i>KYC</i> на бирже, включи <i>2FA</i>, добавь платёжные методы. Выдели <b>рабочие карты</b> (не личные).</li>  

        <li><b>Проверка спреда.</b> Проанализируй цены из стаканов:  
        — «<i>Продажа</i>» (где ты покупаешь USDT у людей) и  
        — «<i>Покупка</i>» (где ты продаёшь USDT людям).  
        Посчитай <b>чистую маржу ≥ 3–5%</b> с учётом комиссий.</li>  

        <li><b>Создай объявление на покупку USDT</b> (ты отображаешься во вкладке «<i>Продажа</i>»).  
        Цена в <b>топ-5</b>, лимиты от <b>1500₽</b>, срок оплаты <i>30 мин</i>.</li>  

        <li><b>Покупка.</b> Пришёл продавец → отправил тебе реквизиты → переводишь по реквизитам и отмечаешь сделку <b>оплаченной</b>.</li>  

        <li><b>Создай объявление на продажу USDT</b> (ты отображаешься во вкладке «<i>Покупка</i>»).  
        Цена в <b>топ-5</b>, лимиты от <b>1500₽</b>, срок оплаты <i>30 мин</i>.  
        <b>Условия:</b> ФИО=ФИО, обязательный комментарий <i>«Сделка для &lt;ник&gt;»</i>, точная сумма до копейки. <b>Без комментария не отпускаю.</b></li>  

        <li><b>Продажа.</b> Пришёл покупатель → отправляешь ему реквизиты для оплаты → получаешь деньги на карту → проверяешь <b>ФИО/комментарий/сумму</b>.  
        Нет комментария → попроси <i>1 ₽</i> с нужным комментарием. Всё ок → отпускаешь USDT.</li>  

        <li><b>Учёт.</b> Запиши курс покупки/продажи, объём, комиссии, <b>чистую прибыль и маржу %</b>.</li>  

        <li><b>Повтор круга.</b> Обновляй цену каждые <i>20–30 мин</i>. Держи <b>1–2 параллельные сделки</b>. Уходишь → выключай объявления.</li>  

        <li><b>Антифрод.</b> Никаких переводов «<i>в обход</i>», без юрлиц и третьих лиц.  
        Звонки банка про «возврат» → <b>отказ</b>.  
        Два параллельных платежа одинаковой суммы → отпускаешь только по тому <b>ордеру</b>, откуда пришли деньги.</li>  

        <li><b>Масштабирование.</b> Постепенно поднимай лимиты, подключай новые карты и вторую биржу.  
        Фокус: <b>скорость оборота</b> + <b>стабильная чистая маржа</b>.</li>  
        </ul>
      </SectionCard>

      <SectionCard title="Безопасность и здравый смысл" icon="🛡️" muted>
        <ul className="list-disc pl-5 space-y-1">
        <li><b>Работай только в рамках правил</b>: сделки проводи строго через P2P-биржу, переводы — только с личных карт.  
        Никаких серых схем, «дропов» и договорённостей вне платформы.</li>

        <li><b>Всегда проверяй реквизиты</b>: ФИО отправителя должно полностью совпадать с указанным в ордере.  
        Назначение платежа — с комментарием «Сделка для &lt;ник&gt;». Без комментария крипту не отпускай.</li>

        <li><b>Скорость не важнее безопасности</b>: лучше провести 3 сделки без ошибок, чем 10 с риском.  
        Проверяй каждый перевод и не торопись отпускать USDT.</li>

        </ul>
      </SectionCard>

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
