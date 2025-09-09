'use client';

import { useEffect, useMemo, useState } from 'react';
import { createLead, initSupabaseFromTelegram } from '@/lib/db';

export default function ConsultPage() {
  // Инициализация (не блокирует форму)
  useEffect(() => {
    initSupabaseFromTelegram().catch(() => {});
  }, []);

  // Автоподстановка из Telegram
  const tgUser = useMemo(() => {
    try {
      const wa = (window as any)?.Telegram?.WebApp;
      const u = wa?.initDataUnsafe?.user;
      if (!u) return null;
      return {
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '',
        username: u.username ? `@${u.username}` : '',
      };
    } catch {
      return null;
    }
  }, []);

  // Поля формы
  const [name, setName] = useState(tgUser?.name ?? '');
  const [tgNick, setTgNick] = useState(tgUser?.username ?? '');
  const [phone, setPhone] = useState('');
  const [time, setTime] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (loading) return;

    const msg =
      [
        name || tgUser?.name ? `Имя: ${name || tgUser?.name}` : null,
        tgNick || tgUser?.username ? `TG: ${tgNick || tgUser?.username}` : null,
        phone ? `Телефон: ${phone}` : null,
        time ? `Время: ${time}` : null,
        topic ? `Тема: ${topic}` : null,
      ]
        .filter(Boolean)
        .join('\n') || 'Консультация';

    try {
      setLoading(true);
      await createLead({
        lead_type: 'consult',
        name: name || tgUser?.name || undefined,
        handle: tgNick || tgUser?.username || undefined,
        phone: phone || undefined,
        comment:
          [time && `Желаемое время: ${time}`, topic && `Тема: ${topic}`]
            .filter(Boolean)
            .join(' | ') || undefined,
        message: msg,
      });
      alert('✅ Заявка отправлена! Мы свяжемся с вами в Telegram.');
      setPhone('');
      setTime('');
      setTopic('');
    } catch (e: any) {
      alert('❌ Ошибка отправки: ' + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-[var(--content-max)] px-4 py-5">
      <h1 className="text-3xl font-extrabold tracking-tight">Запись на консультацию</h1>
      <div className="mt-2 h-[3px] w-24 rounded bg-[var(--brand)]" />

      <div className="glass mt-4 rounded-[18px] p-4">
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span>Имя</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none"
              placeholder="Ваше имя"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Telegram @username</span>
            <input
              value={tgNick}
              onChange={(e) => setTgNick(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none"
              placeholder="@username"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Телефон (необязательно)</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none"
              placeholder="+7…"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Желаемое время консультации (необязательно)</span>
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none"
              placeholder="Например, пн–пт после 18:00"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Тема консультации</span>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[84px] rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none resize-y"
              placeholder="Коротко опишите тему (цели, вопросы, опыт, банки и т.п.)"
            />
          </label>
        </div>

        <div className="mt-4">
          <button
            className="btn-brand inline-flex h-11 min-w-36 items-center justify-center rounded-xl px-4 font-semibold"
            onClick={handleSubmit}
            disabled={loading}
            title={loading ? 'Отправляем…' : 'Записаться'}
          >
            {loading ? 'Отправляем…' : 'Записаться'}
          </button>
        </div>
      </div>

      <p className="mt-6 pb-24 text-center text-xs text-[var(--muted)]">@your_bot</p>
    </main>
  );
}
