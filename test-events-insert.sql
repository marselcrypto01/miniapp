-- Тест записи событий в user_events
-- Выполните этот запрос в Supabase SQL Editor

-- Тест 1: Прямая вставка через SQL
INSERT INTO public.user_events (
  client_id,
  username,
  event,
  lesson_id,
  meta
) VALUES (
  'test-direct-insert',
  '@testuser',
  'test_pass',
  1,
  jsonb_build_object(
    'correct_answers', 3,
    'total_questions', 5,
    'percentage', 60
  )
);

-- Тест 2: Проверяем RPC функцию
SELECT public.record_test_pass(
  'test-rpc-function',
  2, -- lesson_id
  4, -- correct_answers
  5, -- total_questions
  80, -- percentage
  '@testuser2' -- username
);

-- Проверяем, что события записались
SELECT 
  client_id,
  username,
  event,
  lesson_id,
  meta->>'percentage' as percentage,
  occurred_at
FROM public.user_events 
WHERE client_id IN ('test-direct-insert', 'test-rpc-function')
ORDER BY occurred_at DESC;
