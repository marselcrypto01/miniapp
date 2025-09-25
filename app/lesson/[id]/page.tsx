'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import PresenceClient from '@/components/PresenceClient';
import TestComponent from '@/components/TestComponent';
import {
  initSupabaseFromTelegram,
  saveUserProgress,
  getLessonMaterials,
  type DbLessonMaterial,
} from '@/lib/db';
import VkVideo from '@/components/VkVideo';

const WRAP = 'mx-auto max-w-[var(--content-max)] px-4';
const CORE_LESSONS_COUNT = 5;

/** ВСТАВЬ СВОИ РЕФ-ССЫЛКИ ЗДЕСЬ — для кнопок бирж в уроке 3 */
const EXCHANGES: Array<{ label: string; href: string }> = [
  { label: 'Топ 1 - BingX', href: 'https://bingx.com/invite/N409JF/' },
  { label: 'Топ 2 - MEXC', href: 'https://promote.mexc.com/r/6rVhxsI3' },
  { label: 'Топ 3 - Bitget', href: 'https://share.bitget.com/u/G0H33NUE' },
];

type Tab = 'desc' | 'test' | 'goodies';
type Progress = { lesson_id: number; status: 'completed' | 'pending' };

const TITLES: Record<number, string> = {
  1: 'Крипта без сложных слов',
  2: 'Арбитраж: простой способ зарабатывать',
  3: 'Риски и страхи: как купить свою первую крипту',
  4: '5 ошибок новичков, которые убивают заработок',
  5: 'Финал: твой первый шаг в мир крипты',
};

/** VK-видео */
const VIDEO_SRC: Record<number, string> = {
  1: 'https://vkvideo.ru/video_ext.php?oid=-232370516&id=456239108&hd=4&hash=f7a8774a46c42003',
  2: 'https://vkvideo.ru/video_ext.php?oid=-232370516&id=456239109&hd=4&hash=6cf7acb62455397d',
  3: 'https://vkvideo.ru/video_ext.php?oid=-232370516&id=456239110&hd=4&hash=61fb46ca6efcd2ca',
  4: 'https://vkvideo.ru/video_ext.php?oid=-232370516&id=456239111&hd=4&hash=f886761db99c9539',
  5: 'https://vkvideo.ru/video_ext.php?oid=-232370516&id=456239112&hd=4&hash=70005799c7f09ad1',
};

/** Описания для каждого урока */
const DESCRIPTIONS: Record<number, { intro: string; points: string[]; outro: string }> = {
  1: {
    intro: 'Что на самом деле скрывается за словом «крипта»? В этом видео ты узнаешь:',
    points: [
      'зачем уже 400+ миллионов людей по всему миру используют крипту,',
      'как работает блокчейн простыми словами,',
      'какие монеты реально нужны новичку,',
      'и почему начать можно без миллиона на счету.',
    ],
    outro: '📌 Это первый шаг к тому, чтобы понять крипту и перестать бояться того, что тормозит 9 из 10 людей.',
  },
  2: {
    intro: '«Заработок на крипте» звучит подозрительно? На деле есть способ, где ты не рискуешь, не торгуешь графики и не гадаешь на удачу. В этом видео разберём:',
    points: [
      'как работает P2P-арбитраж простыми словами,',
      'почему деньги в сделке всегда защищены,',
      'откуда берётся прибыль, если «все такие умные»,',
      'и сколько реально может зарабатывать новичок.',
    ],
    outro: '📌 Это та часть крипты, которая не миф и не хайп, а нормальный инструмент для дополнительного дохода.',
  },
  3: {
    intro: 'Боишься, что крипта незаконна, налоговая найдёт, а банк заморозит карту? Это типичные страхи новичков. Но правда в том, что 90% из них — мифы. В этом видео:',
    points: [
      'почему P2P-арбитраж не нарушает закон,',
      'как банки реально относятся к переводам,',
      'что делать при заморозке карты,',
      'и как исключить риск «грязных переводов».',
    ],
    outro: '📌 Если знать правила игры, потерять деньги невозможно. Смотри, чтобы не бояться там, где нечего бояться.',
  },
  4: {
    intro: 'Думаешь, купить крипту сложно и рискованно? На деле это проще, чем оплатить коммуналку в приложении банка. В этом видео:',
    points: [
      'ТОП-3 биржи, где новичку реально безопасно начать,',
      'как купить USDT прямо в Telegram за пару минут,',
      'зачем нужен USDT и что с ним можно делать,',
      'чек-лист ошибок, которые сливают деньги у новичков.',
    ],
    outro: '📌 Смотри до конца — после этого урока твой страх «я не разберусь» исчезнет.',
  },
  5: {
    intro: 'Ты дошёл до финала курса. Большинство бросают на середине, а ты доказал себе, что можешь идти до конца. В этом видео:',
    points: [
      'разбор, что реально изменилось у тебя после курса,',
      'почему первый шаг важнее суммы на старте,',
      'истории учеников, которые уже начали зарабатывать,',
      'главное — выбор, который ты сделаешь дальше.',
    ],
    outro: '📌 Этот урок — не теория. Это точка, где решается: останется ли крипта для тебя «интересной темой» или станет реальным источником дохода.',
  },
};

/* === user-scoped localStorage === */
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

export default function LessonPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id || 1);

  const [tab, setTab] = React.useState<Tab>('desc');
  const [done, setDone] = React.useState<boolean>(false);
  const [progress, setProgress] = React.useState<Progress[]>([]);
  const [authReady, setAuthReady] = React.useState(false);
  const [materials, setMaterials] = React.useState<DbLessonMaterial[] | null>(null);
  const [loadingMaterials, setLoadingMaterials] = React.useState(false);
  const [animateTab, setAnimateTab] = React.useState<Tab>('desc');

  const title = `Урок ${id}. ${TITLES[id] ?? 'Видео-урок'}`;

  React.useEffect(() => {
    let off = false;
    (async () => {
      try {
        await initSupabaseFromTelegram();
      } catch {} finally {
        if (!off) setAuthReady(true);
      }
    })();
    return () => {
      off = true;
    };
  }, []);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(ns('progress'));
      const arr: Progress[] = raw ? JSON.parse(raw) : [];
      setProgress(Array.isArray(arr) ? arr : []);
      const st = arr.find((p) => p.lesson_id === id)?.status === 'completed';
      setDone(!!st);
    } catch {
      setProgress([]);
      setDone(false);
    }
  }, [id]);

  React.useEffect(() => {
    let off = false;
    (async () => {
      setLoadingMaterials(true);
      try {
        const data = await getLessonMaterials(id);
        if (!off) setMaterials(data);
      } catch {
        if (!off) setMaterials([]);
      } finally {
        if (!off) setLoadingMaterials(false);
      }
    })();
    return () => {
      off = true;
    };
  }, [id]);

  const persistProgress = async (arr: Progress[]) => {
    try {
      localStorage.setItem(ns('progress'), JSON.stringify(arr));
    } catch {}
    try {
      if (authReady) {
        await saveUserProgress(
          arr.map((x) => ({ lesson_id: Number(x.lesson_id), status: x.status }))
        );
      }
    } catch {}
  };

  const toggleDone = async () => {
    try {
      let arr = [...progress];
      const idx = arr.findIndex((p) => p.lesson_id === id);
      const status: 'completed' | 'pending' = done ? 'pending' : 'completed';
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], status };
      } else {
        arr.push({ lesson_id: id, status });
      }
      setProgress(arr);
      setDone(!done);
      await persistProgress(arr);
    } catch {}
  };

  const canGoPrev = id > 1;
  const canGoNext = id < CORE_LESSONS_COUNT;

  const completedCount = React.useMemo(
    () => progress.filter((p) => p.status === 'completed' && p.lesson_id <= CORE_LESSONS_COUNT).length,
    [progress]
  );
  const coursePct = Math.min(100, Math.round((completedCount / CORE_LESSONS_COUNT) * 100));

  return (
    <main className={`${WRAP} py-4`}>
      <PresenceClient page="lesson" activity={`Урок ${id}`} lessonId={id} progressPct={coursePct} />

      <header className="mb-3 w-full">
        <h1 className="text-2xl font-extrabold tracking-tight leading-[1.1]">{title}</h1>
        <div className="mt-2 h-[3px] w-24 rounded bg-[var(--brand)]" />
      </header>

      <section className="glass p-4 rounded-2xl mb-3 w-full">
        <div className="text-[15px] font-semibold mb-3">🎬 Видео-урок #{id}</div>
        <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-black">
          <VkVideo src={VIDEO_SRC[id]} title={title} />
        </div>
      </section>

      <div className="w-full mb-3">
        <div className="grid grid-cols-3 rounded-xl overflow-hidden border border-[var(--border)]">
          {[
            { key: 'desc' as const, label: 'Описание', icon: '📝' },
            { key: 'test' as const, label: 'Тест', icon: '✅' },
            { key: 'goodies' as const, label: 'Полезное', icon: '📎' },
          ].map((t, i) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setAnimateTab(t.key); }}
                className={`min-h-11 h-auto py-2 w-full flex items-center justify-center gap-1.5
                  text-sm ${active ? 'bg-[var(--brand)] text-black' : 'bg-[var(--surface)] text-[var(--fg)]'}
                  ${i !== 0 ? 'border-l border-[var(--border)]' : ''}`}
                aria-pressed={active}
              >
                <span>{t.icon}</span>
                <span className="whitespace-nowrap [font-size:clamp(12px,2.8vw,14px)]">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'desc' && (
        <section
          className={`glass p-4 rounded-2xl w-full transition-transform duration-300 ${
            animateTab === 'desc' ? 'animate-[fadeIn_.3s_ease]' : ''
          }`}
        >
          <div className="space-y-3 text-[14px] leading-relaxed">
            <p className="font-medium">{DESCRIPTIONS[id]?.intro}</p>
            <ul className="list-disc pl-5 space-y-1">
              {DESCRIPTIONS[id]?.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
            <p className="mt-3 italic text-[var(--muted)]">{DESCRIPTIONS[id]?.outro}</p>
          </div>
        </section>
      )}

      {tab === 'test' && (
        <TestComponent
          lessonId={id}
          onTestComplete={(result) => {
            console.log('Test completed:', result);
          }}
        />
      )}

      {tab === 'goodies' && (
        <section
          className={`glass p-4 rounded-2xl w-full transition-transform duration-300 ${
            animateTab === 'goodies' ? 'animate-[fadeIn_.3s_ease]' : ''
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[15px] font-semibold">📎 Полезное к уроку</div>
            {loadingMaterials ? (
              <div className="text-xs text-[var(--muted)]">Загрузка…</div>
            ) : null}
          </div>

          {/* Кнопки бирж — как в бонусах. Показываем первыми и только для урока 3 */}
          {id === 3 ? (
            <div className="mb-3">
              <div className="text-[13px] text-[var(--muted)] mb-2">Рекомендованные биржи для старта:</div>
              <div className="flex flex-wrap">
                {EXCHANGES.map((x) => (
                  <a
                    key={x.label}
                    href={x.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--bg)] text-[12px] mr-2 mb-2 hover:opacity-90 active:translate-y-[1px]"
                  >
                    {x.label} <span className="ml-1">↗</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {(!materials || materials.length === 0) && !loadingMaterials ? (
            <div className="text-sm text-[var(--muted)]">Пока пусто. Загляните позже.</div>
          ) : (
            <div className="grid gap-2">
              {(materials ?? []).map((m, idx) => (
                <div
                  key={m.id}
                  className={`rounded-xl border border-[var(--border)] p-3 bg-[var(--surface)] transition-all duration-300 ${
                    idx % 2 ? 'translate-y-[0.5px]' : ''
                  }`}
                >
                  {m.kind === 'link' && (
                    <div className="flex items-start gap-3">
                      <div className="mt-[2px]">🔗</div>
                      <div className="min-w-0 w-full">
                        <div className="text-sm font-semibold break-words">{m.title}</div>
                        {m.description ? (
                          <div className="text-xs text-[var(--muted)] mt-1 break-words leading-relaxed">
                            {m.description}
                          </div>
                        ) : null}
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block mt-2 text-xs px-2 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] break-all"
                        >
                          {m.url}
                        </a>
                      </div>
                    </div>
                  )}
                  {m.kind === 'image' && (
                    <div className="flex items-start gap-3">
                      <div className="mt-[2px]">🖼️</div>
                      <div className="min-w-0 w-full">
                        <div className="text-sm font-semibold mb-2 break-words">{m.title}</div>
                        <div className="rounded-xl overflow-hidden border border-[var(--border)]">
                          <img src={m.url} alt={m.title} className="w-full block" />
                        </div>
                        {m.description ? (
                          <div className="mt-2 text-xs text-[var(--muted)] whitespace-pre-wrap break-words leading-relaxed">
                            {m.description}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                  {m.kind === 'text' && (
                    <div className="flex items-start gap-3">
                      <div className="mt-[2px]">📝</div>
                      <div className="min-w-0 w-full">
                        <div className="text-sm font-semibold mb-2 break-words">{m.title}</div>
                        <div className="text-[13.5px] leading-relaxed whitespace-pre-line">
                          {m.url}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="mt-4 w-full grid grid-cols-2 min-[420px]:grid-cols-4 gap-2">
        <button
          onClick={() => canGoPrev && router.push(`/lesson/${id - 1}`)}
          disabled={!canGoPrev}
          className="h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)]
                     font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 w-full"
          title="Предыдущий"
        >
          <span>←</span>
          <span className="whitespace-nowrap [font-size:clamp(12px,2.8vw,14px)]">Предыдущий</span>
        </button>

        <button
          onClick={() => canGoNext && router.push(`/lesson/${id + 1}`)}
          disabled={!canGoNext}
          className="h-11 rounded-xl font-semibold text-sm w-full flex items-center justify-center gap-2
                     disabled:opacity-50
                     bg-[var(--brand)] text-black"
          title="Следующий"
        >
          <span className="whitespace-nowrap [font-size:clamp(12px,2.8vw,14px)]">Следующий</span>
          <span>→</span>
        </button>

        <button
          onClick={() => router.push('/')}
          className="h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)]
                     flex items-center justify-center gap-2 text-sm w-full"
          title="На главную"
        >
          <span>🏠</span>
          <span className="whitespace-nowrap [font-size:clamp(12px,2.8vw,14px)]">На главную</span>
        </button>

        <button
          onClick={toggleDone}
          className={`h-11 rounded-xl font-semibold text-sm w-full flex items-center justify-center gap-2 border
            ${done
              ? 'bg-[color-mix(in_oklab,green_45%,var(--surface))] text-black border-[var(--border)]'
              : 'bg-[var(--surface)] text-[var(--fg)] border-[var(--border)]'}`}
          title="Отметить как пройдено"
        >
          <span>{done ? '✅' : '☑️'}</span>
          <span className="whitespace-nowrap [font-size:clamp(12px,2.8vw,14px)]">Пройдено</span>
        </button>
      </div>

      <div className="pb-24" />
    </main>
  );
}

