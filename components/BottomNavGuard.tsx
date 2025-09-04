'use client';
import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';

export default function BottomNavGuard() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null; // не показываем на админке
  return <BottomNav />;
}
