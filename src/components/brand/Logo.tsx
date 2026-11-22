import { useId } from "react";

import {
  LOGO_HEIGHT,
  LOGO_PATH,
  LOGO_RING,
  LOGO_STROKE,
  LOGO_WIDTH,
} from "@/components/brand/logo-geometry";

/**
 * The Nowhere wordmark. Uses the surrounding text colour (currentColor), so it works in light and dark themes.
 * Size it with a height class, e.g. className="h-[18px]".
 */
export function Logo({ className = "" }: { className?: string }) {
  const clipId = useId();
  return (
    <svg
      viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`}
      role="img"
      aria-label="Nowhere"
      className={`w-auto ${className}`}
      style={{ aspectRatio: `${LOGO_WIDTH} / ${LOGO_HEIGHT}` }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={-20} y={0} width={LOGO_WIDTH + 40} height={LOGO_HEIGHT} />
        </clipPath>
      </defs>
      <g
        clipPath={`url(#${clipId})`}
        fill="none"
        stroke="currentColor"
        strokeWidth={LOGO_STROKE}
        strokeLinejoin="miter"
        strokeMiterlimit={10}
      >
        <path d={LOGO_PATH} />
        <circle cx={LOGO_RING.cx} cy={LOGO_RING.cy} r={LOGO_RING.r} />
      </g>
      <circle cx={LOGO_RING.cx} cy={LOGO_RING.cy} r={LOGO_RING.dot} fill="currentColor" />
    </svg>
  );
}
