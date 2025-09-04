'use client';

import { useEffect } from 'react';

export default function EdgeSync() {
  useEffect(() => {
    const sel = '[data-mainbar-inner]';

    const apply = () => {
      const inner = document.querySelector<HTMLElement>(sel);
      if (!inner) {
        document.documentElement.style.setProperty('--edge-left', '16px');
        document.documentElement.style.setProperty('--edge-right', '16px');
        return;
      }
      const r = inner.getBoundingClientRect(); // ширина бара c padding’ами
      const left = Math.max(0, Math.round(r.left));
      const right = Math.max(0, Math.round(window.innerWidth - r.right));
      document.documentElement.style.setProperty('--edge-left', `${left}px`);
      document.documentElement.style.setProperty('--edge-right', `${right}px`);
    };

    apply();
    const ro = new ResizeObserver(apply);
    const el = document.querySelector<HTMLElement>(sel);
    if (el) ro.observe(el);
    window.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      ro.disconnect();
    };
  }, []);

  return null;
}
