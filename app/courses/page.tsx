'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

/** Совпадает с мини-баром */
const WRAP = 'mx-auto max-w-[var(--content-max)] px-4';

type FormatKey = 'group' | 'pro';

/** чип */
const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center px-2.5 h-7 rounded-full text-[12px] whitespace-nowrap
                   bg-[color-mix(in_oklab,var(--surface-2)60%,transparent)]
                   border border-[var(--border)]">
    {children}
  </span>
);

export default function CoursesPage() {
  const router = useRouter();

  /* блокировать заявки, если курс не завершён */
  const [locked, setLocked] = useState(true);
  useEffect(() => {
    try { setLocked(!(localStorage.getItem('all_completed') === 'true')); } catch {}
  }, []);

  /* аккордеоны */
  const [open, setOpen] = useState<{ [K in FormatKey]?: boolean }>({});

  /* сравнение (bottom sheet) и форма заявки (modal) */
  const [sheet, setSheet] = useState(false);
  const [formOpen, setFormOpen] = useState<null | FormatKey>(null);

  /* автоподстановка из Telegram */
  const tgUser = useMemo(() => {
    try {
      // @ts-ignore
      const wa = (window as any)?.Telegram?.WebApp;
      const u = wa?.initDataUnsafe?.user;
      if (!u) return null;
      return {
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || undefined,
        username: u.username ? `@${u.username}` : undefined,
      };
    } catch { return null; }
  }, []);

  const formats: Record<FormatKey, {
    title: string;
    teaser: string;
    bullets: string[];
    audience: string;
    result: string;
    time: string;
    chips: string[];
    emoji: string;
    ctaNote: string;
  }> = {
    group: {
      title: 'Групповой курс: Аренда за Крипту',
      teaser:
        '1 неделя эфиров + практика. За месяц — первые стабильные сделки и доход, достаточный для аренды.',
      bullets: [
        '5 эфиров (пн-пт) + 2 практических дня',
        'Чек-листы, инструкции, разбор рисков',
        'Доступ к закрытому боту с материалами',
        'Поддержка в чате 3 недели',
      ],
      audience: '«Полный ноль», кто хочет быстрый старт',
      result:
        'Понимаете механику арбитража, умеете делать сделки, выход на стабильный доход для аренды',
      time: '1–2 часа в день, старт — еженедельно',
      chips: ['⏱ 1 неделя эфиров', '🧑‍🤝‍🧑 Группа + чат', '🛟 Поддержка 3 недели'],
      emoji: '👥',
      ctaNote: 'Рассрочка через Сбер — по запросу',
    },
    pro: {
      title: 'Индивидуальное обучение: КриптоМарс PRO',
      teaser:
        '4 созвона 1:1, персональные связки, быстрый прогресс и бессрочная поддержка.',
      bullets: [
        'Диагностика и персональный план',
        'Разбор ваших банков/платёжек и рисков',
        'Настройка рабочих связок под ваш режим',
        'Бессрочная поддержка и доступ в клуб',
      ],
      audience: 'Кому нужен быстрый результат и индивидуальный подход',
      result: 'Выстроенная личная система, стабильные сделки, масштабирование',
      time: 'График под вас, старт по договорённости',
      chips: ['🎯 1:1 созвоны', '🧩 Личные связки', '♾ Бессрочно в поддержку'],
      emoji: '💼',
      ctaNote: 'Рассрочка — по запросу',
    },
  };

  const openForm = (fmt: FormatKey) => setFormOpen(fmt);

  return (
    <main className={`${WRAP} py-4`}>
      {/* Заголовок */}
      <header className="mb-3 w-full">
        <h1 className="text-2xl font-extrabold tracking-tight leading-[1.1]">Следующий шаг</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          После завершения базового курса доступны расширенные программы обучения.
        </p>
      </header>

      {/* Сравнить форматы */}
      <div className="w-full mb-3">
        <button
          onClick={() => setSheet(true)}
          className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)]
                     text-sm font-semibold active:translate-y-[1px]"
        >
          Сравнить форматы
        </button>
      </div>

      {/* Карточки-аккордеоны */}
      <section className="w-full space-y-3">
        {(Object.keys(formats) as FormatKey[]).map((key) => {
          const f = formats[key];
          const expanded = !!open[key];

          return (
            <article
              key={key}
              className={`glass rounded-2xl w-full transition-shadow ${expanded ? 'shadow-[0_12px_32px_rgba(0,0,0,.35)]' : ''}`}
            >
              {/* Шапка карточки */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="grid place-items-center text-xl w-10 h-10 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                    {f.emoji}
                  </div>
                  <div className="min-w-0 grow">
                    <div className="font-semibold text-[18px] leading-tight">{f.title}</div>

                    {/* тизер — 2 строки, clamp */}
                    <p
                      className="mt-1 text-[14px] text-[var(--muted)] leading-snug overflow-hidden"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                    >
                      {f.teaser}
                    </p>

                    {/* чипы — одна строка со скроллом */}
                    <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      {f.chips.map((c, i) => <Chip key={i}>{c}</Chip>)}
                    </div>

                    {/* CTA в шапке: мини-кнопки */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        disabled={locked}
                        onClick={() => openForm(key)}
                        className={`h-9 px-3 rounded-lg text-sm font-semibold border
                                    ${locked
                                      ? 'opacity-60 cursor-not-allowed bg-[var(--surface)] border-[var(--border)]'
                                      : 'bg-[var(--brand)] text-black border-[color-mix(in_oklab,var(--brand)70%,#000_30%)] active:translate-y-[1px]'}`}
                      >
                        {locked ? 'После курса' : 'Заявка'}
                      </button>
                      <button
                        onClick={() => setOpen((s) => ({ ...s, [key]: !expanded }))}
                        className="h-9 px-3 rounded-lg text-sm font-semibold border border-[var(--border)]
                                   bg-[var(--surface)] active:translate-y-[1px]"
                      >
                        {expanded ? 'Свернуть' : 'Подробнее'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Разворот */}
              {expanded && (
                <div className="px-4 pb-4 pt-0">
                  <div className="h-px w-full bg-[var(--border)] mb-3" />

                  <div className="space-y-3 text-[14px]">
                    <div>
                      <div className="font-semibold mb-1">Что внутри</div>
                      <ul className="list-disc pl-5 space-y-1">
                        {f.bullets.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>

                    <div>
                      <div className="font-semibold mb-1">Для кого</div>
                      <p className="text-[var(--muted)]">{f.audience}</p>
                    </div>

                    <div>
                      <div className="font-semibold mb-1">Результат</div>
                      <p className="text-[var(--muted)]">{f.result}</p>
                    </div>

                    <div>
                      <div className="font-semibold mb-1">Время и требования</div>
                      <p className="text-[var(--muted)]">{f.time}</p>
                    </div>
                  </div>

                  {/* Большой CTA в развороте */}
                  <button
                    disabled={locked}
                    onClick={() => openForm(key)}
                    className={`mt-3 w-full h-11 rounded-xl font-semibold border
                                ${locked
                                  ? 'opacity-60 cursor-not-allowed bg-[var(--surface)] border-[var(--border)]'
                                  : 'bg-[var(--brand)] text-black border-[color-mix(in_oklab,var(--brand)70%,#000_30%)] active:translate-y-[1px]'}`}
                  >
                    {locked ? 'Доступ после прохождения курса' : 'Оставить заявку'}
                  </button>
                  <p className="mt-1 text-xs text-center text-[var(--muted)]">{f.ctaNote}</p>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <p className="mt-6 pb-24 text-center text-xs text-[var(--muted)]">@your_bot</p>

      {/* ───────── Bottom Sheet: сравнение форматов ───────── */}
      {sheet && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSheet(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[var(--content-max)]
                          rounded-t-2xl bg-[var(--surface)] border-t border-[var(--border)] p-4">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-[var(--border)] mb-3" />
            <div className="text-lg font-bold mb-2">Сравнить форматы</div>

            <div className="space-y-2 text-sm">
              {[
                ['Длительность', '1 неделя + 3 нед. поддержки', '4 созвона + сопровождение'],
                ['Формат', 'Эфиры + задания', '1:1 созвоны'],
                ['Материалы', 'Бот, чек-листы', 'Персональные связки'],
                ['Поддержка', '3 недели', 'Бессрочно'],
                ['Для кого', 'Старт с нуля', 'Быстрый рост'],
                ['Результат', 'Первые сделки', 'Система + масштаб'],
                ['Оплата', 'Разовая / рассрочка', 'Рассрочка по запросу'],
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-1 gap-1 rounded-xl border border-[var(--border)] p-2
                                        min-[420px]:grid-cols-[1.1fr_.9fr_.9fr]">
                  <div className="font-semibold">{row[0]}</div>
                  <div className="text-[var(--muted)]">{row[1]}</div>
                  <div className="text-[var(--muted)]">{row[2]}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="h-10 rounded-xl bg-[var(--brand)] text-black font-semibold
                           border border-[color-mix(in_oklab,var(--brand)70%,#000_30%)] active:translate-y-[1px]"
                onClick={() => { setSheet(false); openForm('group'); }}
              >
                Заявка на группу
              </button>
              <button
                className="h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] font-semibold active:translate-y-[1px]"
                onClick={() => { setSheet(false); openForm('pro'); }}
              >
                Заявка 1:1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────── Модалка «Оставить заявку» ───────── */}
      {formOpen && (
        <FormModal
          formatKey={formOpen}
          title={formats[formOpen].title}
          onClose={() => setFormOpen(null)}
          locked={locked}
          tgName={tgUser?.name}
          tgUsername={tgUser?.username}
          onSubmit={(payload) => {
            // TODO: сюда поставь свой webhook/бота
            console.log('REQUEST:', payload);
            alert('Заявка отправлена ✨ Мы свяжемся в Telegram.');
            setFormOpen(null);
            // router.push('/consult'); // если нужно редиректить
          }}
        />
      )}
    </main>
  );
}

/* ───────── ФОРМА ЗАЯВКИ ───────── */
function FormModal(props: {
  formatKey: FormatKey;
  title: string;
  locked: boolean;
  tgName?: string;
  tgUsername?: string;
  onClose: () => void;
  onSubmit: (payload: {
    format: FormatKey;
    name?: string;
    handle?: string;
    phone?: string;
    start?: string;
    comment?: string;
    agree: boolean;
  }) => void;
}) {
  const [name, setName] = useState(props.tgName || '');
  const [handle, setHandle] = useState(props.tgUsername || '');
  const [phone, setPhone] = useState('');
  const [start, setStart] = useState<'now' | 'month' | 'unsure'>('now');
  const [comment, setComment] = useState('');
  const [agree, setAgree] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) return;
    props.onSubmit({
      format: props.formatKey,
      name,
      handle,
      phone,
      start,
      comment,
      agree,
    });
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/50" onClick={props.onClose} />
      <div className="absolute left-1/2 -translate-x-1/2 top-6 w-[min(92vw, var(--content-max))] rounded-2xl
                      bg-[var(--surface)] border border-[var(--border)] p-4">
        <div className="text-lg font-bold">Оставить заявку</div>
        <p className="text-sm text-[var(--muted)] mt-0.5">{props.title}</p>

        <form className="mt-3 space-y-2" onSubmit={submit}>
          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Имя</label>
            <input
              className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none"
              value={name} onChange={(e)=>setName(e.target.value)} placeholder="Как к вам обращаться"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Ник/телеграм</label>
            <input
              className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none"
              value={handle} onChange={(e)=>setHandle(e.target.value)} placeholder="@username"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Телефон (опционально)</label>
            <input
              className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none"
              value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+7…"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Удобный старт</label>
            <select
              className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none"
              value={start} onChange={(e)=>setStart(e.target.value as any)}
            >
              <option value="now">на этой неделе</option>
              <option value="month">в течение месяца</option>
              <option value="unsure">уточню</option>
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Комментарий (опционально)</label>
            <textarea
              className="min-h-[72px] rounded-xl px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] outline-none resize-y"
              value={comment} onChange={(e)=>setComment(e.target.value)} placeholder="Коротко о задаче, опыте, банках…"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} />
            <span>Согласен на обработку данных</span>
          </label>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={props.onClose}
              className="h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] font-semibold"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!agree || props.locked}
              className={`h-10 rounded-xl font-semibold border
                ${(!agree || props.locked)
                  ? 'opacity-60 cursor-not-allowed bg-[var(--surface)] border-[var(--border)]'
                  : 'bg-[var(--brand)] text-black border-[color-mix(in_oklab,var(--brand)70%,#000_30%)] active:translate-y-[1px]'}`}
            >
              Отправить заявку
            </button>
          </div>

          <p className="text-xs text-center text-[var(--muted)] pt-1">
            После отправки мы свяжемся с вами в Telegram
          </p>
        </form>
      </div>
    </div>
  );
}
