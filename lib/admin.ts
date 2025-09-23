// lib/admin.ts
export const ADMIN_USERNAMES = [
  'marselv1', // ← ВПИШИ свой username без @
];

// Текущий username из Telegram WebApp или ?u=...
export function getCurrentUsernameClient(): string | null {
  if (typeof window === 'undefined') return null;
  const tg = (window as any)?.Telegram?.WebApp;
  const fromTg = tg?.initDataUnsafe?.user?.username;
  if (fromTg) return fromTg;

  const url = new URL(window.location.href);
  const u = url.searchParams.get('u');
  return u || null;
}

// Админ ли пользователь (в локалке: ?admin=1)
export function isAdminClient(): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  if (url.searchParams.get('admin') === '1') return true;

  const u = getCurrentUsernameClient();
  if (!u) return false;
  return ADMIN_USERNAMES.map((x) => x.toLowerCase()).includes(u.toLowerCase());
}
