// app/api/leads/submit/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Body = {
  lead_type: 'consult' | 'course';
  name?: string;
  handle?: string;      // в виде @username (необяз.)
  phone?: string;
  comment?: string;     // любые заметки
  message?: string;     // сводка формы
  client_id?: string | null; // можно передавать guest-* id
  username?: string | null;  // @ник, если знаем
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    // БАЗОВАЯ ВАЛИДАЦИЯ
    if (!body || (body.lead_type !== 'consult' && body.lead_type !== 'course')) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }

    // Подключаемся service-role ключом (только на сервере!)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !service) {
      return NextResponse.json({ ok: false, error: 'server_misconfigured' }, { status: 500 });
    }
    const admin = createClient(url, service, { auth: { persistSession: false } });

    // Готовим поля
    const insert = {
      lead_type: body.lead_type,
      name: body.name ?? null,
      handle: body.handle ?? null,
      phone: body.phone ?? null,
      comment: body.comment ?? null,
      message: body.message ?? null,
      client_id: body.client_id ?? null,
      username: body.username ?? null,
      status: 'new' as const,
    };

    const { error } = await admin.from('leads').insert(insert);
    if (error) {
      return NextResponse.json({ ok: false, error: String(error.message || error) }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
