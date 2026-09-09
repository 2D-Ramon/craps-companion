"use client";

import { useId } from "react";
import type { Die } from "@/lib/types";

const PIPS: Record<Die, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
};

export function DiceFace({
  n,
  size = 44,
  rolling = false,
}: {
  n: Die;
  size?: number;
  rolling?: boolean;
}) {
  const gid = useId();
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`die-face ${rolling ? "die-rolling" : ""}`}
      aria-label={`Die ${n}`}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="100%" stopColor="#e6dcc8" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="90" height="90" rx="18" fill={`url(#${gid})`} stroke="#2a2118" strokeWidth="4" />
      {PIPS[n].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={n === 6 ? 7.5 : 8.5} fill={n === 1 ? "#b42318" : "#1a120c"} />
      ))}
    </svg>
  );
}
