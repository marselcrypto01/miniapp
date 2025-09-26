import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { 
      client_id, 
      username, 
      lesson_id, 
      correct_answers, 
      total_questions, 
      percentage 
    } = body || {};

    // Валидация
    if (!client_id || typeof lesson_id !== 'number' || typeof percentage !== 'number') {
      return NextResponse.json({ ok: false, error: 'Bad payload' }, { status: 400 });
    }

    const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env as Record<string, string | undefined>;
    if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: true, mock: true });
    }

    // Используем service role ключ для записи в user_events
    const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
      auth: { persistSession: false } 
    });

    const { error } = await admin.from('user_events').insert({
      client_id,
      username: username || null,
      event: 'test_pass',
      lesson_id,
      meta: {
        correct_answers: correct_answers || 0,
        total_questions: total_questions || 1,
        percentage,
      },
    });

    if (error) {
      console.error('Failed to insert test pass event:', error);
      return NextResponse.json({ ok: false, error: String(error.message || error) }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Test pass API error:', e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
