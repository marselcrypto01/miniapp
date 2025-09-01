import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BOT_TOKEN = process.env.BOT_TOKEN!;

function getSecretKey(token: string) {
  return crypto.createHmac('sha256', 'WebAppData').update(token).digest();
}

function validateInitData(initDataStr: string, token: string) {
  const urlData = new URLSearchParams(initDataStr);
  const hash = urlData.get('hash');
  if (!hash) return false;
  urlData.delete('hash');

  const arr: string[] = [];
  for (const [k, v] of [...urlData.entries()].sort()) arr.push(`${k}=${v}`);
  const dcs = arr.join('\n');

  const secretKey = getSecretKey(token);
  const computed = crypto.createHmac('sha256', secretKey).update(dcs).digest('hex');

  try { return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash)); }
  catch { return false; }
}

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json() as { initData?: string };
    if (!initData || !validateInitData(initData, BOT_TOKEN)) {
      return NextResponse.json({ ok: false, error: 'Invalid initData' }, { status: 401 });
    }

    const params = new URLSearchParams(initData);
    const userJson = params.get('user');
    const tg = userJson ? JSON.parse(userJson) : null;

    if (tg?.id) {
      const { data } = await supabaseAdmin.from('users')
        .select('id').eq('tg_user_id', tg.id).single();

      if (!data) {
        await supabaseAdmin.from('users').insert({
          tg_user_id: tg.id,
          username: tg.username ?? null,
          first_name: tg.first_name ?? null,
          last_name: tg.last_name ?? null
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
