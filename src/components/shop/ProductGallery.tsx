import { useRef, useState } from "react";

import { FadeImage } from "@/components/shop/FadeImage";
import { optimizeImageUrl } from "@/lib/image-tools";

/**
 * Phones: swipeable full-width strip (native scroll-snap, no JS gesture code) with position dots.
 * Desktop: thumbnail column plus one large viewer with hover zoom. A single set of images serves both layouts.
 */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const many = images.length > 1;

  const onScroll = () => {
    const el = strip.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== active) setActive(Math.min(images.length - 1, Math.max(0, index)));
  };
  const go = (i: number) => {
    setActive(i);
    const el = strip.current;
    if (el && el.scrollWidth > el.clientWidth)
      el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`${name} photos`}
      className={`min-w-0 ${many ? "md:grid md:grid-cols-[84px_1fr] md:gap-4" : ""}`}
    >
      {many && (
        <ul className="order-first hidden flex-col gap-3 md:flex">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-current={i === active}
                className={`block aspect-[4/5] w-full overflow-hidden border transition-opacity ${i === active ? "border-foreground" : "border-border opacity-70 hover:opacity-100"}`}
              >
                <img
                  src={optimizeImageUrl(src, 200)}
                  alt=""
                  width={168}
                  height={210}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="min-w-0">
        <div
          ref={strip}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:block md:overflow-hidden [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, i) => (
            <figure
              key={src}
              aria-label={`Photo ${i + 1} of ${images.length}`}
              onPointerMove={(e) => {
                if (e.pointerType !== "mouse" || i !== active) return;
                const r = e.currentTarget.getBoundingClientRect();
                setZoom({
                  x: ((e.clientX - r.left) / r.width) * 100,
                  y: ((e.clientY - r.top) / r.height) * 100,
                });
              }}
              onPointerLeave={() => setZoom(null)}
              className={`relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-card md:cursor-zoom-in ${i === active ? "" : "md:hidden"}`}
            >
              <FadeImage
                src={optimizeImageUrl(src, 1100)}
                alt={i === 0 ? name : `${name}, photo ${i + 1}`}
                width={960}
                height={1200}
                sizes="(min-width: 1024px) 55vw, 100vw"
                {...(i === 0
                  ? { fetchPriority: "high" as const, loading: "eager" as const }
                  : { loading: "lazy" as const })}
                decoding="async"
                draggable={false}
                className="size-full object-cover transition-transform duration-200 ease-out"
                style={
                  zoom && i === active
                    ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` }
                    : undefined
                }
              />
            </figure>
          ))}
        </div>
        {many && (
          <div className="mt-3 flex items-center justify-center gap-2 md:hidden">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-current={i === active}
                className="flex size-6 items-center justify-center"
              >
                <span
                  className={`size-2 rounded-full transition-colors ${i === active ? "bg-foreground" : "bg-foreground/25"}`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
