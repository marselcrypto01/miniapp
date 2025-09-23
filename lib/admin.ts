// lib/admin.ts
export const ADMIN_USERNAMES = [
  'marselv1', // без "@", в нижнем регистре
];

export function normalizeUsername(u?: string | null) {
  return (u || '').trim().replace(/^@/, '').toLowerCase();
}

export function getCurrentUsernameClient(): string | null {
  if (typeof window === 'undefined') return null;
  // Telegram WebApp
  const wa = (window as any)?.Telegram?.WebApp;
  const fromTg = wa?.initDataUnsafe?.user?.username as string | undefined;
  if (fromTg) return fromTg;

  // Фолбэк: ?u=username
  const url = new URL(window.location.href);
  const u = url.searchParams.get('u');
  return u || null;
}

export function isAdminUsername(u?: string | null) {
  const name = normalizeUsername(u);
  if (!name) return false;
  return ADMIN_USERNAMES.includes(name);
}

// Для локалки/демо
export function isDemoAdminParam(): boolean {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(location.search);
  return q.get('demoAdmin') === '1' || q.get('admin') === '1';
}
