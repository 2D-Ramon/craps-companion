import type { Die, Total } from "./types";

export function asDie(n: number): Die {
  if (n < 1 || n > 6) throw new Error("die");
  return n as Die;
}

export function asTotal(n: number): Total {
  if (n < 2 || n > 12) throw new Error("total");
  return n as Total;
}

/** Unbiased 1-6 using rejection sampling on crypto RNG. */
export function trueDie(): Die {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    return asDie(1 + Math.floor(Math.random() * 6));
  }
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    const v = buf[0] >>> 0;
    const max = Math.floor(0x100000000 / 6) * 6;
    if (v < max) return asDie((v % 6) + 1);
  }
}

export function truePair(): { a: Die; b: Die; total: Total } {
  const a = trueDie();
  const b = trueDie();
  return { a, b, total: asTotal(a + b) };
}

export const EXPECTED_TOTAL: Record<Total, number> = {
  2: 1 / 36,
  3: 2 / 36,
  4: 3 / 36,
  5: 4 / 36,
  6: 5 / 36,
  7: 6 / 36,
  8: 5 / 36,
  9: 4 / 36,
  10: 3 / 36,
  11: 2 / 36,
  12: 1 / 36,
};

export const PAIR_GROUPS: { key: string; totals: Total[] }[] = [
  { key: "2/12", totals: [2, 12] },
  { key: "3/11", totals: [3, 11] },
  { key: "4/10", totals: [4, 10] },
  { key: "5/9", totals: [5, 9] },
  { key: "6/8", totals: [6, 8] },
  { key: "7", totals: [7] },
];

export function isHard(a: Die | null, b: Die | null, total: Total): boolean | null {
  if (a == null || b == null) return null;
  return a === b && (total === 4 || total === 6 || total === 8 || total === 10);
}

export function faceKey(a: Die, b: Die): string {
  return `${a}-${b}`;
}
