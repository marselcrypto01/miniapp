// app/lesson/[id]/layout.tsx
// ВАЖНО: без 'use client' — это серверный layout этого сегмента
export const runtime = 'nodejs';

export default function LessonSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ничего не меняем в верстке — просто прокидываем детей
  return <>{children}</>;
}
