// lib/lessons.ts
export type LessonMeta = {
  id: number;
  title: string;
  subtitle?: string;
  videoUrl?: string | null;
  description?: string;
  hasTest?: boolean; // вкладка "Тест"
};

export const LESSONS: LessonMeta[] = [
  { id: 1, title: 'Крипта простыми словами', videoUrl: null, description: 'Базовая терминология и что такое крипта.', hasTest: true },
  { id: 2, title: 'Арбитраж: как это работает', videoUrl: null, description: 'Суть арбитража и цепочки обмена.', hasTest: true },
  { id: 3, title: 'Риски, мифы и страхи', videoUrl: null, description: 'Какие риски есть и как их снижать.', hasTest: true },
  { id: 4, title: 'Главные ошибки новичков', videoUrl: null, description: 'Частые фейлы и как их избежать.', hasTest: true },
  { id: 5, title: 'Итог: как двигаться дальше', videoUrl: null, description: 'Роудмап следующего шага.', hasTest: true },
  // 6-й модуль без теста
  { id: 6, title: 'Дополнительная полезная информация', subtitle: 'Чек-листы, шпаргалки, ссылки…', videoUrl: null, description: 'Сводные материалы и полезности.', hasTest: false },
];

export const CORE_LESSON_COUNT = 5;

export function getLessonById(id: number): LessonMeta | undefined {
  return LESSONS.find(l => l.id === id);
}
