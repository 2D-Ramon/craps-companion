import { EXPECTED_TOTAL, PAIR_GROUPS, isHard } from "./dice";
import { applyRoll } from "./puck";
import type { Puck, Roll, Total } from "./types";

export type Stats = {
  n: number;
  totals: Record<Total, { count: number; pct: number; exp: number }>;
  groups: { key: string; count: number; pct: number; exp: number }[];
  hard: Record<4 | 6 | 8 | 10, { hard: number; easy: number }>;
  faces: number[][];
  knownFaces: number;
  sevenOuts: number;
  pointsMade: number;
  rollsPerShooter: number[];
  repeaters: { total: Total; streak: number; max: number }[];
};

const EMPTY_TOTALS = () => {
  const t = {} as Record<Total, { count: number; pct: number; exp: number }>;
  for (let n = 2; n <= 12; n++) {
    t[n as Total] = { count: 0, pct: 0, exp: EXPECTED_TOTAL[n as Total] };
  }
  return t;
};

export function computeStats(rolls: Roll[]): Stats {
  const n = rolls.length;
  const totals = EMPTY_TOTALS();
  const faces = Array.from({ length: 6 }, () => Array(6).fill(0));
  let knownFaces = 0;
  const hard: Stats["hard"] = {
    4: { hard: 0, easy: 0 },
    6: { hard: 0, easy: 0 },
    8: { hard: 0, easy: 0 },
    10: { hard: 0, easy: 0 },
  };

  const byShooter = new Map<number, number>();
  let sevenOuts = 0;
  let pointsMade = 0;
  let puck: Puck = { on: false };

  for (let i = 0; i < rolls.length; i++) {
    const r = rolls[i];
    totals[r.total].count += 1;
    byShooter.set(r.shooter, (byShooter.get(r.shooter) ?? 0) + 1);
    const call = applyRoll(puck, r.total);
    if (call.sevenOut) sevenOuts += 1;
    if (call.pointMade) pointsMade += 1;
    puck = call.puck;
    const h = isHard(r.a, r.b, r.total);
    if (h === true) hard[r.total as 4 | 6 | 8 | 10].hard += 1;
    if (h === false && (r.total === 4 || r.total === 6 || r.total === 8 || r.total === 10)) {
      hard[r.total].easy += 1;
    }
    if (r.a && r.b) {
      faces[r.a - 1][r.b - 1] += 1;
      knownFaces += 1;
    }
  }

  if (n) {
    for (let k = 2; k <= 12; k++) {
      totals[k as Total].pct = totals[k as Total].count / n;
    }
  }

  const groups = PAIR_GROUPS.map((g) => {
    const count = g.totals.reduce((s, t) => s + totals[t].count, 0);
    const exp = g.totals.reduce((s, t) => s + EXPECTED_TOTAL[t], 0);
    return { key: g.key, count, pct: n ? count / n : 0, exp };
  });

  const repeaters: Stats["repeaters"] = [];
  let streakTotal: Total | null = null;
  let streak = 0;
  const maxBy: Partial<Record<Total, number>> = {};
  for (const r of rolls) {
    if (r.total === streakTotal) streak += 1;
    else {
      streakTotal = r.total;
      streak = 1;
    }
    maxBy[r.total] = Math.max(maxBy[r.total] ?? 0, streak);
  }
  for (let t = 2; t <= 12; t++) {
    const max = maxBy[t as Total] ?? 0;
    if (max >= 2) repeaters.push({ total: t as Total, streak: max, max });
  }
  repeaters.sort((a, b) => b.max - a.max);

  return {
    n,
    totals,
    groups,
    hard,
    faces,
    knownFaces,
    sevenOuts,
    pointsMade,
    rollsPerShooter: [...byShooter.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]),
    repeaters,
  };
}

export function windowRolls(rolls: Roll[], n: number): Roll[] {
  return n <= 0 ? rolls : rolls.slice(-n);
}
