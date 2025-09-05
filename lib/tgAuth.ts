export async function fetchJwtFromEdge() {
  const wa = (window as any)?.Telegram?.WebApp;
  if (!wa?.initData) throw new Error('No Telegram initData');
  const res = await fetch(process.env.NEXT_PUBLIC_TG_AUTH_URL!, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initData: wa.initData }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ token: string; clientId: string; role: 'user'|'admin'; start_param?: string }>;
}
