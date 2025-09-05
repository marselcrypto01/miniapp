'use client';

import Link from 'next/link';
import { PropsWithChildren } from 'react';

export default function AdminLayout({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Админ-панель</h1>
      </header>

      {children}
    </div>
  );
}
