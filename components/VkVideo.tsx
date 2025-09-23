// components/VkVideo.tsx
import * as React from "react";

/**
 * Безопасный встраиваемый плеер VK Video.
 * На вход даём ТОЛЬКО src из iframe (https://vkvideo.ru/video_ext.php?...).
 */
type Props = {
  /** Полный src из VK iframe (без самого <iframe>), обязателен */
  src: string | null | undefined;
  /** Подпись/заголовок — для a11y */
  title?: string;
  /** Доп.класс контейнера (если нужно) */
  className?: string;
  /** Соотношение сторон. По умолчанию 16:9 */
  aspect?: "16:9" | "4:3" | "1:1";
};

const ASPECT_TO_PADDING: Record<NonNullable<Props["aspect"]>, string> = {
  "16:9": "pt-[56.25%]",
  "4:3": "pt-[75%]",
  "1:1": "pt-[100%]",
};

function isAllowedVkUrl(url: string) {
  try {
    const u = new URL(url);
    // Разрешаем vkvideo.ru и vk.com (на случай резервного кода)
    return u.hostname === "vkvideo.ru" || u.hostname === "vk.com";
  } catch {
    return false;
  }
}

export default function VkVideo({
  src,
  title = "VK Video",
  className = "",
  aspect = "16:9",
}: Props) {
  if (!src || !isAllowedVkUrl(src)) {
    return (
      <div
        className={`rounded-xl border border-[var(--border)] p-4 text-[var(--muted)] ${className}`}
        role="status"
      >
        Видео недоступно или ссылка задана неверно.
      </div>
    );
  }

  const pad = ASPECT_TO_PADDING[aspect] ?? ASPECT_TO_PADDING["16:9"];

  return (
    <div className={`relative w-full overflow-hidden rounded-xl ${pad} ${className}`}>
      <iframe
        title={title}
        src={src}
        className="absolute left-0 top-0 h-full w-full"
        // всё, что просит VK + что безвредно для мини-приложения
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock"
        allowFullScreen
        // чуть безопаснее
        referrerPolicy="no-referrer-when-downgrade"
        // экономим ресурсы
        loading="lazy"
        frameBorder={0}
      />
    </div>
  );
}
