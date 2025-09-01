// lib/lessons.ts
export type LessonMeta = {
  id: number;
  title: string;
  subtitle?: string;
  videoUrl?: string | null;
  description?: string;
  hasTest?: boolean; // ← флаг: есть ли вкладка "Тест"
};

export const LESSONS: LessonMeta[] = [
  { id: 1, title: 'Крипта простыми словами', videoUrl: null, description: 'Базовая терминология и что такое крипта.', hasTest: true },
  { id: 2, title: 'Арбитраж: как это работает', videoUrl: null, description: 'Суть арбитража и цепочки обмена.', hasTest: true },
  { id: 3, title: 'Риски, мифы и страхи', videoUrl: null, description: 'Какие риски есть и как их снижать.', hasTest: true },
  { id: 4, title: 'Главные ошибки новичков', videoUrl: null, description: 'Частые фейлы и как их избежать.', hasTest: true },
  { id: 5, title: 'Итог: как двигаться дальше', videoUrl: null, description: 'Роудмап следующего шага.', hasTest: true },
  // 6-й модуль: отдельная страница с видео и материалами, НО без теста
  { id: 6, title: 'Дополнительная полезная информация', subtitle: 'Чек-листы, шпаргалки, ссылки…', videoUrl: null, description: 'Сводные материалы и полезности.', hasTest: false },
];

export const CORE_LESSON_COUNT = 5; // первые 5 — основной курс

/** Возвращает массив уроков: сперва пытается взять из admin_lessons (localStorage), иначе — дефолты. */
export function getAllLessons(): LessonMeta[] {
  try {
    if (typeof window === 'undefined') return LESSONS;
    const raw = localStorage.getItem('admin_lessons');
    if (!raw) return LESSONS;
    const list = JSON.parse(raw) as LessonMeta[];
    // Защитимся от поломанных данных: если пустой массив — используем дефолты
    if (!Array.isArray(list) || list.length === 0) return LESSONS;
    return list;
  } catch {
    return LESSONS;
  }
}

/** Возвращает один урок по id с учётом админских правок (localStorage). */
export function getLessonById(id: number): LessonMeta | undefined {
  const fromAdmin = (() => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem('admin_lessons');
      if (!raw) return null;
      const arr = JSON.parse(raw) as LessonMeta[];
      return arr.find((l) => l.id === id) || null;
    } catch {
      return null;
    }
  })();
  return fromAdmin || LESSONS.find((l) => l.id === id);
}
