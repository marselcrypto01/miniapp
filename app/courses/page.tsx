'use client';

import React, { useEffect, useMemo, useState } from 'react';

/** ширина = как у мини-бара через переменную в globals.css */
const WRAP = 'mx-auto max-w-[var(--content-max)] px-4';

type FormatKey = 'group' | 'pro';

/* маленький чип-параметр */
const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    className="inline-flex items-center h-7 px-2.5 rounded-full text-[12px] whitespace-nowrap
               bg-[color-mix(in_oklab,var(--surface-2)60%,transparent)]
               border border-[var(--border)]"
  >
    {children}
  </span>
);

export default function CoursesPage() {
  /* блокировка CTA до прохождения базового курса (оставь/убери по необходимости) */
  const [locked, setLocked] = useState(true);
  useEffect(() => {
    try { setLocked(!(localStorage.getItem('all_completed') === 'true')); } catch {}
  }, []);

  /* аккордеоны */
  const [open, setOpen] = useState<{ [K in FormatKey]?: boolean }>({});

  /* bottom sheet и модалка заявки (sheet можно включить кнопкой, если нужна) */
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
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '',
        username: u.username ? `@${u.username}` : '',
      };
    } catch { return null; }
  }, []);

  /* тексты форматов по ТЗ */
  const formats: Record<FormatKey, {
    title: string;
    emoji: string;
    teaser: string;
    chips: string[];
    bullets: string[];
    audience: string;
    result: string;
    time: string;
    price: string;
    ctaNote?: string;
  }> = {
    group: {
      title: 'Групповой курс: Аренда за Крипту',
      emoji: '🧑‍🤝‍🧑',
      teaser:
        '1 неделя эфиров + практика. Результат: доход от ~70 000 ₽/мес при стабильной работе с простыми связками.',
      chips: ['⏱ 1 неделя', '🧑‍🤝‍🧑 Группа+чат', '🛟 Поддержка 3 нед.'],
      bullets: [
        '5 эфиров (пн–пт) + 2 практических дня',
        'Таблицы учёта сделок и дохода',
        '1 связка без карт (до ~2% к капиталу в день) и 2 связки с картами (до ~7% к капиталу в день)',
        'Доступ к чату с учениками',
        'Доступ к боту с полезным материалом и ИИ (мануалы, связки, схемы)',
        'Поддержка в чате 3 недели',
      ],
      audience:
        '«Полный новичок», кому нужен понятный старт и доход, который покрывает аренду квартиры или базовые расходы. Никто не уходит без работающего способа.',
      result:
        'Базовая система арбитража: стабильный доход от ~70 000 ₽/мес, понимание рисков, умение масштабировать и адаптировать связки под себя. Это не одна «схема», а комплекс навыков и инструментов.',
      time: '1–2 часа в день, старт — раз в месяц',
      price: '50 000 ₽. Доступна официальная рассрочка Сбербанка.',
    },
    pro: {
      title: 'Индивидуальное обучение: КриптоМарс PRO',
      emoji: '💼',
      teaser:
        'Личное обучение с Марселем. Ускоренный старт, доход со второго дня и бессрочная поддержка.',
      chips: ['🎯 1:1 созвоны', '🧩 Личные связки', '♾ Бессрочная поддержка'],
      bullets: [
        'Индивидуальная многослойная стратегия под ваши цели',
        '2 связки без карт (до ~3% к капиталу в день) и 3 связки с картами (до ~10% к капиталу в день)',
        'Заработок со 2-го дня обучения',
        'Таблица учёта сделок и дохода',
        'Масштабирование дохода: переход от «ручного» к системному',
        'Бессрочная поддержка',
        'Доступ в клуб КриптоМарс:',
        'Чат с учениками — разбор кейсов, помощь в спорных ситуациях',
        'Полезные материалы — мануалы, гайды, новые связки',
        'Чат про мошенников — свежие схемы, как не попасться',
        'Чат с проверенными офлайн-обменниками',
      ],
      audience:
        'Тем, кому нужен быстрый и прогнозируемый результат, индивидуальный подход и настройка заработка под ваш режим (график, цели, потребности).',
      result:
        'Выстроенная личная система заработка, выход на доход до ~200 000 ₽/мес и план масштабирования. Постоянная обратная связь и поддержка без срока.',
      time: 'График под вас, старт — по договорённости',
      price: '90 000 ₽. Доступна официальная рассрочка Сбербанка.',
    },
  };

  const openForm = (fmt: FormatKey) => setFormOpen(fmt);

  return (
    <main className={`${WRAP} py-4`}>
      {/* Заголовок */}
      <header className="mb-3 w-full">
        <h1 className="text-2xl font-extrabold tracking-tight leading-[1.1]">Следующий шаг</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Показаны два формата обучения. Коротко — в карточках, детали — по «Подробнее».
        </p>
      </header>

      {/* Карточки-аккордеоны */}
      <section className="w-full space-y-3">
        {(Object.keys(formats) as FormatKey[]).map((key) => {
          const f = formats[key];
          const expanded = !!open[key];

          return (
            <article
              key={key}
              className={`card w-full space-y-3 rounded-2xl ${expanded ? 'shadow-[0_12px_32px_rgba(0,0,0,.35)]' : ''}`}
            >
              {/* Верхняя часть: иконка + заголовок + тизер + чипы + две кнопки */}
              <div className="grid grid-cols-[40px_1fr] gap-3">
                {/* Иконка — строго 40×40 */}
                <div className="w-10 h-10 rounded-xl grid place-items-center bg-[var(--surface-2)] border border-[var(--border)] text-[18px] leading-none">
                  {f.emoji}
                </div>

                <div className="min-w-0">
                  <h3 className="text-[18px] font-semibold leading-tight">{f.title}</h3>

                  {/* тизер — clamp до 2 строк */}
                  <p
                    className="mt-1 text-[14px] text-[var(--muted)] leading-snug overflow-hidden"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                  >
                    {f.teaser}
                  </p>

                  {/* ЧИПЫ: всегда видны → перенос по строкам */}
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {f.chips.map((c, i) => <Chip key={i}>{c}</Chip>)}
                  </div>

                  {/* две равные кнопки */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      disabled={locked}
                      onClick={() => openForm(key)}
                      className={`h-11 w-full rounded-xl font-semibold border
                                  ${locked
                                    ? 'opacity-60 cursor-not-allowed bg-[var(--surface)] border-[var(--border)]'
                                    : 'bg-[var(--brand)] text-black border-[color-mix(in_oklab,var(--brand)70%,#000_30%)] active:translate-y-[1px]'}`}
                    >
                      {locked ? 'После курса' : 'Заявка'}
                    </button>
                    <button
                      onClick={() => setOpen((s) => ({ ...s, [key]: !expanded }))}
                      className="h-11 w-full rounded-xl font-semibold border border-[var(--border)]
                                 bg-[var(--surface)] active:translate-y-[1px]"
                    >
                      {expanded ? 'Свернуть' : 'Подробнее'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Развёрнутый контент */}
              {expanded && (
                <div className="pt-3 border-t border-[var(--border)] space-y-3">
                  {/* Что внутри */}
                  <div>
                    <div className="font-semibold mb-1">Что внутри</div>
                    <ul className="list-disc pl-5 space-y-1 text-[14px]">
                      {f.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Для кого */}
                  <div>
                    <div className="font-semibold mb-1">Для кого</div>
                    <p className="text-[14px] text-[var(--muted)]">{f.audience}</p>
                  </div>

                  {/* Результат */}
                  <div>
                    <div className="font-semibold mb-1">Результат</div>
                    <p className="text-[14px] text-[var(--muted)]">{f.result}</p>
                  </div>

                  {/* Время и требования */}
                  <div>
                    <div className="font-semibold mb-1">Время и требования</div>
                    <p className="text-[14px] text-[var(--muted)]">{f.time}</p>
                  </div>

                  {/* Цена */}
                  <div>
                    <div className="font-semibold mb-1">Цена</div>
                    <p className="text-[14px] text-[var(--muted)]">{f.price}</p>
                  </div>

                  {/* большой CTA */}
                  <button
                    disabled={locked}
                    onClick={() => openForm(key)}
                    className={`mt-1 w-full h-11 rounded-xl font-semibold border
                                ${locked
                                  ? 'opacity-60 cursor-not-allowed bg-[var(--surface)] border-[var(--border)]'
                                  : 'bg-[var(--brand)] text-black border-[color-mix(in_oklab,var(--brand)70%,#000_30%)] active:translate-y-[1px]'}`}
                  >
                    {locked ? 'После курса' : 'Оставить заявку'}
                  </button>
                  {f.ctaNote && (
                    <p className="text-xs text-center text-[var(--muted)]">{f.ctaNote}</p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <p className="mt-6 pb-24 text-center text-xs text-[var(--muted)]">@your_bot</p>

      {/* bottom sheet (оставлен как в предыдущей версии; отображается, если setSheet(true)) */}
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
                ['Оплата', 'Разовая / рассрочка', 'Разовая / рассрочка'],
              ].map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-1 rounded-xl border border-[var(--border)] p-2
                             min-[420px]:grid-cols-[1.05fr_.95fr_.95fr]"
                >
                  <div className="font-semibold">{row[0]}</div>
                  <div className="text-[var(--muted)]">{row[1]}</div>
                  <div className="text-[var(--muted)]">{row[2]}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="h-11 rounded-xl bg-[var(--brand)] text-black font-semibold
                           border border-[color-mix(in_oklab,var(--brand)70%,#000_30%)] active:translate-y-[1px]"
                onClick={() => { setSheet(false); setFormOpen('group'); }}
              >
                Заявка на групповой курс
              </button>
              <button
                className="h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] font-semibold active:translate-y-[1px]"
                onClick={() => { setSheet(false); setFormOpen('pro'); }}
              >
                Заявка на обучение 1:1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* модалка «Оставить заявку» */}
      {formOpen && (
        <FormModal
          formatKey={formOpen}
          title={formats[formOpen].title}
          onClose={() => setFormOpen(null)}
          locked={locked}
          tgName={tgUser?.name || ''}
          tgUsername={tgUser?.username || ''}
          onSubmit={(payload) => {
            // TODO: отправка в твоего бота/вебхук
            console.log('REQUEST:', payload);
            alert('Заявка отправлена ✨ Мы свяжемся в Telegram.');
            setFormOpen(null);
          }}
        />
      )}
    </main>
  );
}

/* ───────── форма заявки ───────── */
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
  }) => void;
}) {
  const [name, setName] = useState(props.tgName);
  const [handle, setHandle] = useState(props.tgUsername);
  const [phone, setPhone] = useState('');
  const [start, setStart] = useState<'now' | 'month' | 'unsure'>('now');
  const [comment, setComment] = useState('');
  const [agree, setAgree] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree || props.locked) return;
    props.onSubmit({
      format: props.formatKey,
      name, handle, phone, start, comment, agree,
    });
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/50" onClick={props.onClose} />
      <div
        className="absolute left-1/2 -translate-x-1/2 top-6 w-[min(92vw,420px)]
                   rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4"
      >
        <div className="text-lg font-bold">Оставить заявку</div>
        <p className="text-sm text-[var(--muted)] mt-0.5">{props.title}</p>

        <form className="mt-3 space-y-2" onSubmit={submit}>
          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Имя</label>
            <input
              className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none w-full"
              value={name} onChange={(e)=>setName(e.target.value)} placeholder="Как к вам обращаться"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Ник/телеграм</label>
            <input
              className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none w-full"
              value={handle} onChange={(e)=>setHandle(e.target.value)} placeholder="@username"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Телефон (опционально)</label>
            <input
              className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none w-full"
              value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+7…"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-[var(--muted)]">Удобный старт</label>
            <select
              className="h-10 rounded-xl px-3 bg-[var(--surface-2)] border border-[var(--border)] outline-none w-full"
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
              className="min-h-[72px] rounded-xl px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)]
                         outline-none resize-y w-full"
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
              className="h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] font-semibold w-full"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!agree || props.locked}
              className={`h-11 rounded-xl font-semibold border w-full
                ${(!agree || props.locked)
                  ? 'opacity-60 cursor-not-allowed bg-[var(--surface)] border-[var(--border)]'
                  : 'bg-[var(--brand)] text-black border-[color-mix(in_oklab,var(--brand)70%,#000_30%)] active:translate-y-[1px]'}`}
            >
              Отправить заявку
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
