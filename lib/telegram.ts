'use client';

type TgUser = { id: number; first_name?: string; last_name?: string; username?: string };

function parseInitDataString(initData: string): Partial<TgUser> | null {
  try {
    const sp = new URLSearchParams(initData);
    const userRaw = sp.get('user');
    if (!userRaw) return null;
    const json = JSON.parse(userRaw);
    if (json && typeof json === 'object') return json as TgUser;
  } catch {}
  return null;
}

export function readTelegramUserNow(): Partial<TgUser> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const wa = w?.Telegram?.WebApp;
    const fromUnsafe = wa?.initDataUnsafe?.user as TgUser | undefined;
    if (fromUnsafe && (wa?.initData?.length ?? 0) > 0) return fromUnsafe;

    // try tgWebAppData from hash
    const hash = window.location.hash || '';
    const m = hash.match(/tgWebAppData=([^&]+)/);
    if (m?.[1]) {
      const decoded = decodeURIComponent(m[1]);
      const parsed = parseInitDataString(decoded);
      if (parsed) return parsed as TgUser;
    }
  } catch {}
  return null;
}

export async function waitForTelegramUser(timeoutMs = 4000): Promise<Partial<TgUser> | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const u = readTelegramUserNow();
    if (u) return u;
    await new Promise((r) => setTimeout(r, 100));
  }
  return readTelegramUserNow();
}

export function getDisplayName(u: Partial<TgUser> | null): string | null {
  if (!u) return null;
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
  return name || u.username || null;
}


