'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createLead, initSupabaseFromTelegram } from '@/lib/db';

const WRAP = 'mx-auto max-w-[var(--content-max)] px-4';
type FormatKey = 'group' | 'pro';

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    className="inline-flex items-center h-7 px-2.5 rounded-full text-[12px] whitespace-nowrap
               bg-[color-mix(in_oklab,var(--surface-2)60%,transparent)]
               border border-[var(--border)]"
  >
    {children}
  </span>
);

/* user-scoped localStorage */
function getTgIdSync(): string | null {
  try {
    const wa = (window as any)?.Telegram?.WebApp;
    const id = wa?.initDataUnsafe?.user?.id;
    return (id ?? null)?.toString?.() ?? null;
  } catch { return null; }
}
function ns(key: string): string {
  const id = getTgIdSync();
  return id ? `${key}:tg_${id}` : `${key}:anon`;
}

export default function CoursesPage() {
  // Инициализация
  useEffect(() => { initSupabaseFromTelegram().catch(() => {}); }, []);

  const [locked, setLocked] = useState(true);
  useEffect(() => {
    try { setLocked(!(localStorage.getItem(ns('all_completed')) === 'true')); } catch {}
  }, []);

  const [open, setOpen] = useState<{ [K in FormatKey]?: boolean }>({});
  const [formOpen, setFormOpen] = useState<null | FormatKey>(null);

  const tgUser = useMemo(() => {
    try {
      const wa = (window as any)?.Telegram?.WebApp;
      const u = wa?.initDataUnsafe?.user;
      if (!u) {
        // В режиме разработки возвращаем демо-данные
        const isDev = process.env.NODE_ENV === 'development' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('localhost');
        if (isDev) {
          return {
            name: 'Друг',
            username: '@demo_user',
          };
        }
        return null;
      }
      return {
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '',
        username: u.username ? `@${u.username}` : '',
      };
    } catch { return null; }
  }, []);

  const formats: Record<FormatKey, {
    title: string; emoji: string; teaser: string; chips: string[];
    bullets: string[]; audience: string; result: string; time: string;
    price: string; ctaNote?: string;
  }> = {
    group: {
      title: 'Групповой курс: Аренда за Крипту',
      emoji: '🧑‍🤝‍🧑',
      teaser: '1 неделя эфиров + практика. Результат: доход от ~70 000 ₽/мес при стабильной работе.',
      chips: ['⏱ 1 неделя', '🧑‍🤝‍🧑 Группа+чат', '🤝 Поддержка 3 нед.'],
      bullets: [
        '5 эфиров (пн–пт) + 2 практических дня',
        'Таблицы учёта сделок и дохода',
        '1 связка без карт и 2 со картами',
        'Чат с учениками и бот с материалами',
        'Поддержка 3 недели',
      ],
      audience: 'Новичкам для понятного старта и дохода.',
      result: 'Базовая система арбитража, стабильный доход, масштабирование.',
      time: '1–2 часа в день, старт — раз в месяц',
      price: '50 000 ₽. Доступна рассрочка Сбербанка.',
    },
    pro: {
      title: 'Индивидуальное обучение: КриптоМарс PRO',
      emoji: '💼',
      teaser: 'Личное обучение. Быстрый старт, доход со 2-го дня и бессрочная поддержка.',
      chips: ['🎯 1:1 созвоны', '🧩 Личные связки', '♾ Поддержка'],
      bullets: [
        'Стратегия под цели',
        '2 связки без карт и 3 с картами',
        'Заработок со 2-го дня',
        'Таблица учёта',
        'Масштабирование',
        'Бессрочная поддержка',
        'Доступ в клуб',
      ],
      audience: 'Нужен быстрый прогнозируемый результат.',
      result: 'До ~200 000 ₽/мес + план масштабирования.',
      time: 'График под вас, старт — по договорённости',
      price: '90 000 ₽. Доступна рассрочка Сбербанка.',
    },
  };

  const openForm = (fmt: FormatKey) => setFormOpen(fmt);

  return (
    <main className={`${WRAP} py-4`}>
      <header className="mb-3 w-full">
        <h1 className="text-2xl font-extrabold tracking-tight leading-[1.1]">Следующий шаг</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Два формата обучения. Коротко — в карточках, детали — по «Подробнее».
        </p>
      </header>

      <section className="w-full space-y-3">
        {(Object.keys(formats) as FormatKey[]).map((key) => {
          const f = formats[key];
          const expanded = !!open[key];

          return (
            <article
              key={key}
              className={`card w-full space-y-3 rounded-2xl ${expanded ? 'shadow-[0_12px_32px_rgba(0,0,0,.35)]' : ''}`}
            >
              <div className="grid grid-cols-[40px_1fr] gap-3">
                <div className="w-10 h-10 rounded-xl grid place-items-center bg-[var(--surface-2)] border border-[var(--border)] text-[18px] leading-none">
                  {f.emoji}
                </div>

                <div className="min-w-0">
                  <h3 className="text-[18px] font-semibold leading-tight">{f.title}</h3>
                  <p
                    className="mt-1 text-[14px] text-[var(--muted)] leading-snug overflow-hidden"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                  >
                    {f.teaser}
                  </p>

                  <div className="mt-2 flex gap-2 flex-wrap">
                    {f.chips.map((c, i) => <Chip key={i}>{c}</Chip>)}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      disabled={locked}
                      onClick={() => openForm(key)}
                      className={`inline-flex h-11 w-full items-center justify-center rounded-xl font-semibold border
                        ${locked
                          ? 'opacity-60 cursor-not-allowed bg-[var(--surface)] border-[var(--border)]'
                          : 'bg-[var(--brand)] text-black border-[color-mix(in_oklab,var(--brand)70%,#000_30%)] active:translate-y-[1px]'}`}
                    >
                      {locked ? 'После курса' : 'Заявка'}
                    </button>
                    <button
                      onClick={() => setOpen((s) => ({ ...s, [key]: !expanded }))}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl font-semibold border border-[var(--border)]
                                 bg-[var(--surface)] active:translate-y-[1px]"
                    >
                      {expanded ? 'Свернуть' : 'Подробнее'}
                    </button>
                  </div>
                </div>
              </div>

              {expanded && (
                <div className="pt-3 border-t border-[var(--border)] space-y-3">
                  <div>
                    <div className="font-semibold mb-1">Что внутри</div>
                    <ul className="list-disc pl-5 space-y-1 text-[14px]">
                      {f.bullets.map((b, i) => (<li key={i}>{b}</li>))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Для кого</div>
                    <p className="text-[14px] text-[var(--muted)]">{f.audience}</p>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Результат</div>
                    <p className="text-[14px] text-[var(--muted)]">{f.result}</p>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Время и требования</div>
                    <p className="text-[14px] text-[var(--muted)]">{f.time}</p>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Цена</div>
                    <p className="text-[14px] text-[var(--muted)]">{f.price}</p>
                  </div>

                  <button
                    disabled={locked}
                    onClick={() => openForm(key)}
                    className={`inline-flex mt-1 h-11 w-full items-center justify-center rounded-xl font-semibold border
                      ${locked
                        ? 'opacity-60 cursor-not-allowed bg-[var(--surface)] border-[var(--border)]'
                        : 'bg-[var(--brand)] text-black border-[color-mix(in_oklab,var(--brand)70%,#000_30%)] active:translate-y-[1px]'}`}
                  >
                    {locked ? 'После курса' : 'Оставить заявку'}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <p className="mt-6 pb-24 text-center text-xs text-[var(--muted)]">@your_bot</p>

      {formOpen && (
        <FormModal
          formatKey={formOpen}
          title={formats[formOpen].title}
          onClose={() => setFormOpen(null)}
          locked={locked}
          tgName={tgUser?.name || ''}
          tgUsername={tgUser?.username || ''}
          onSubmit={async (payload) => {
            const msg = [
              `Формат: ${payload.format === 'group' ? 'Групповой' : 'Индивидуальный'}`,
              payload.name ? `Имя: ${payload.name}` : null,
              payload.handle ? `TG: ${payload.handle}` : null,
              payload.phone ? `Телефон: ${payload.phone}` : null,
              payload.start ? `Старт: ${payload.start}` : null,
              payload.comment ? `Комментарий: ${payload.comment}` : null,
            ].filter(Boolean).join('\n');

            try {
              await createLead({
                lead_type: 'course',
                name: payload.name || undefined,
                handle: payload.handle || undefined,
                phone: payload.phone || undefined,
                comment: [`Старт: ${payload.start}`, payload.comment].filter(Boolean).join(' | '),
                message: msg,
              });
              alert('✅ Заявка отправлена! Мы свяжемся в Telegram.');
              setFormOpen(null);
            } catch (e: any) {
              alert('❌ Ошибка отправки: ' + String(e?.message || e));
            }
          }}
        />
      )}
    </main>
  );
}

function FormModal(props: {
  formatKey: FormatKey;
  title: string;
  locked: boolean;
  tgName: string;
  tgUsername: string;
  onClose: () => void;
  onSubmit: (payload: {
    format: FormatKey;
    name: string;
    handle: string;
    phone: string;
    start: 'now' | 'month' | 'unsure';
    comment: string;
    agree: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(props.tgName);
  const [handle, setHandle] = useState(props.tgUsername);
  const [phone, setPhone] = useState('');
  const [start, setStart] = useState<'now' | 'month' | 'unsure'>('now');
  const [comment, setComment] = useState('');
  const [agree, setAgree] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree || props.locked || sending) return;
    setSending(true);
    try {
      await props.onSubmit({ format: props.formatKey, name, handle, phone, start, comment, agree });
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/50" onClick={props.onClose} />
      <div className="absolute left-1/2 -translate-x-1/2 top-6 w-[min(92vw,420px)]
                      rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
        <div className="text-lg font-bold">Оставить заявку</div>
        <p className="text-sm text-[var(--muted)] mt-0.5">{props.title}</p>

        <form className="mt-3 space-y-2" onSubmit={submit}>
          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Имя</label>
            <input className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none w-full"
                   value={name} onChange={e=>setName(e.target.value)} placeholder="Как к вам обращаться" />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Ник/телеграм</label>
            <input className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none w-full"
                   value={handle} onChange={e=>setHandle(e.target.value)} placeholder="@username" />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Телефон (опционально)</label>
            <input className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none w-full"
                   value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+7…" />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Удобный старт</label>
            <select className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none w-full"
                    value={start} onChange={e=>setStart(e.target.value as any)}>
              <option value="now">на этой неделе</option>
              <option value="month">в течение месяца</option>
              <option value="unsure">уточню</option>
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Комментарий (опционально)</label>
            <textarea className="min-h-[72px] rounded-xl px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)]
                                 outline-none resize-y w-full"
                      value={comment} onChange={e=>setComment(e.target.value)} placeholder="Коротко о задаче, опыте, банках…" />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} />
            <span>Согласен на обработку данных</span>
          </label>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={props.onClose}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--surface-2)] border border-[var(--border)] font-semibold w-full">
              Отмена
            </button>
            <button type="submit" disabled={!agree || props.locked || sending}
                    className={`inline-flex h-11 items-center justify-center rounded-xl font-semibold border w-full
                      ${(!agree || props.locked || sending)
                        ? 'opacity-60 cursor-not-allowed bg-[var(--surface)] border-[var(--border)]'
                        : 'bg-[var(--brand)] text-black border-[color-mix(in_oklab,var(--brand)70%,#000_30%)] active:translate-y-[1px]'}`}>
              {sending ? 'Отправляем…' : 'Отправить заявку'}
            </button>
          </div>

          <p className="text-xs text-center text-[var(--muted)] pt-1">
            После отправки мы свяжемся с вами в Telegram.
          </p>
        </form>
      </div>
    </div>
  );
}
