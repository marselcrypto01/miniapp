'use client';

import Link from 'next/link';
import { PropsWithChildren } from 'react';

export default function AdminLayout({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Админ-панель</h1>
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          ← На главную
        </Link>
      </header>

      <nav className="mb-4 flex gap-2">
        <Link href="/admin" className="tab tab--active">Уроки</Link>
        <Link href="/admin?tab=users" className="tab">Пользователи</Link>
        <Link href="/admin?tab=settings" className="tab">Настройки</Link>
      </nav>

      {children}
    </div>
  );
}
