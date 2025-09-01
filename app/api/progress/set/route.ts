import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BOT_TOKEN = process.env.BOT_TOKEN!;

function getSecretKey(token: string) {
  return crypto.createHmac('sha256', 'WebAppData').update(token).digest();
}
function valid(s: string) {
  const p = new URLSearchParams(s);
  const h = p.get('hash'); if (!h) return false;
  p.delete('hash');
  const arr: string[] = [];
  for (const [k, v] of [...p.entries()].sort()) arr.push(`${k}=${v}`);
  const dcs = arr.join('\n');
  const sk = getSecretKey(BOT_TOKEN);
  const ch = crypto.createHmac('sha256', sk).update(dcs).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(ch), Buffer.from(h)); } catch { return false; }
}

export async function POST(req: NextRequest) {
  const { initData, lessonId, status } = await req.json() as {
    initData?: string; lessonId?: number; status?: string;
  };
  if (!initData || !valid(initData) || typeof lessonId !== 'number' || !status) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const params = new URLSearchParams(initData);
  const userJson = params.get('user'); if (!userJson) return NextResponse.json({ ok: false }, { status: 401 });
  const tg = JSON.parse(userJson); if (!tg?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const { data: userRow } = await supabaseAdmin.from('users')
    .select('id').eq('tg_user_id', tg.id).single();
  if (!userRow?.id) return NextResponse.json({ ok: false }, { status: 404 });

  await supabaseAdmin.from('progress').upsert(
    { user_id: userRow.id, lesson_id: lessonId, status },
    { onConflict: 'user_id,lesson_id' }
  );

  return NextResponse.json({ ok: true });
}
