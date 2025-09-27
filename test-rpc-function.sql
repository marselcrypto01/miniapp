-- Тест RPC функции record_test_pass
-- Выполните этот запрос в Supabase SQL Editor

-- Тестируем функцию
SELECT public.record_test_pass(
  'test-client-123',
  1, -- lesson_id
  3, -- correct_answers
  5, -- total_questions
  60, -- percentage
  '@testuser' -- username
);

-- Проверяем, что событие записалось
SELECT * FROM public.user_events 
WHERE client_id = 'test-client-123' 
ORDER BY occurred_at DESC 
LIMIT 5;
