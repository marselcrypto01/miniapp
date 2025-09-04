'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const [lockedCourses, setLockedCourses] = useState(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem('all_completed') === 'true';
      setLockedCourses(!v);
    } catch {}
  }, [pathname]);

  const Item = ({
    href,
    label,
    icon,
    disabled = false,
  }: {
    href: string;
    label: string;
    icon: string;
    disabled?: boolean;
  }) => {
    const active = pathname === href;
    const base = 'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs';
    const color = active ? 'text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]';
    const styleDisabled = disabled ? 'opacity-50 pointer-events-none' : '';

    return (
      <Link href={href} className={`${base} ${color} ${styleDisabled}`} aria-disabled={disabled}>
        <span
          className="grid place-items-center text-lg w-8 h-8 rounded-md"
          style={{
            background: active
              ? 'color-mix(in oklab, var(--brand-200) 22%, transparent)'
              : 'color-mix(in oklab, var(--surface-2) 40%, transparent)',
            border: '1px solid color-mix(in oklab, var(--brand) 35%, var(--border))',
          }}
        >
          {icon}
        </span>
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <nav
      data-mainbar
      className="fixed left-0 right-0 bottom-0 z-50 mx-auto"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      {/* этот див — тот самый контейнер, по нему выравниваемся */}
      <div data-mainbar-inner className="mx-auto max-w-[var(--content-max)] px-4">
        <div className="glass flex items-center justify-between rounded-[16px] px-2">
          <Item href="/" label="Главная" icon="🏠" />
          <Item href="/courses" label="Курсы" icon={lockedCourses ? '🔒' : '🎓'} disabled={lockedCourses} />
          <Item href="/consult" label="Консультация" icon="📅" />
        </div>
      </div>
    </nav>
  );
}
