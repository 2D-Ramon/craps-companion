"use client";

import { useState } from "react";
import type { Die, Total } from "@/lib/types";
import { asDie } from "@/lib/dice";

export function DicePad({
  onPair,
  onTotal,
  disabled,
}: {
  onPair: (a: Die, b: Die) => void;
  onTotal: (t: Total) => void;
  disabled?: boolean;
}) {
  const [left, setLeft] = useState<Die | null>(null);

  function tapDie(n: Die) {
    if (disabled) return;
    if (left == null) {
      setLeft(n);
      return;
    }
    onPair(left, n);
    setLeft(null);
  }

  function tapTotal(t: Total) {
    if (disabled) return;
    setLeft(null);
    onTotal(t);
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-widest text-muted">
        {left ? `Die 1 is ${left} — tap die 2` : "Tap two dice, or a total"}
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {([1, 2, 3, 4, 5, 6] as Die[]).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => tapDie(asDie(n))}
            className={`h-14 rounded-lg text-xl font-semibold border ${
              left === n
                ? "bg-gold text-felt-deep border-gold"
                : "bg-felt-mid/80 border-gold/30 text-ink"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {([2, 3, 4, 5, 6, 7] as Total[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => tapTotal(t)}
            className={`h-11 rounded-md text-sm font-semibold border ${
              t === 7 ? "bg-seven/90 border-seven text-white" : "bg-black/25 border-gold/20 text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {([8, 9, 10, 11, 12] as Total[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => tapTotal(t)}
            className="h-11 rounded-md text-sm font-semibold border bg-black/25 border-gold/20 text-ink"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
