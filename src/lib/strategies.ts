import type {
  Box,
  BuiltinStrategyId,
  CustomStrategy,
  OpenBets,
  Roll,
  StrategyId,
  TableRules,
} from "./types";
import { emptyBets, settle } from "./payouts";

export const STRATEGIES: BuiltinStrategyId[] = [
  "track",
  "pass-odds",
  "place-68",
  "iron-cross",
  "dont-pass",
];

export const STRATEGY_LABEL: Record<BuiltinStrategyId, string> = {
  track: "Track only",
  "pass-odds": "Pass + odds",
  "place-68": "Place 6 & 8",
  "iron-cross": "Iron Cross",
  "dont-pass": "Don't Pass + odds",
};

export const STRATEGY_BLURB: Record<BuiltinStrategyId, string> = {
  track: "Log rolls and stats. No auto bets.",
  "pass-odds": "Pass line at table min, odds 3-4-5x when the point is on.",
  "place-68": "Place 6 and 8 (inside) and collect.",
  "iron-cross": "Place 5, 6, 8 plus a field bet. Covers everything but 7.",
  "dont-pass": "Don't Pass at table min, lay odds when the point is on.",
};

export function isBuiltin(id: string): id is BuiltinStrategyId {
  return (STRATEGIES as string[]).includes(id);
}

export function strategyLabel(id: StrategyId, customs: CustomStrategy[] = []): string {
  if (isBuiltin(id)) return STRATEGY_LABEL[id];
  return customs.find((c) => c.id === id)?.name ?? "Custom strategy";
}

export function strategyBlurb(id: StrategyId, customs: CustomStrategy[] = []): string {
  if (isBuiltin(id)) return STRATEGY_BLURB[id];
  const c = customs.find((x) => x.id === id);
  if (!c) return "Saved custom strategy.";
  return describeCustom(c);
}

export function describeCustom(c: CustomStrategy): string {
  const bits: string[] = [];
  if (c.pass) bits.push("Pass + odds");
  if (c.dont) bits.push("Don't Pass + odds");
  if (c.place.length) bits.push(`Place ${c.place.join(", ")}`);
  if (c.field) bits.push("Field");
  return bits.length ? bits.join(" · ") : "No auto bets";
}

function place68(min: number): number {
  return Math.max(6, Math.ceil(min / 6) * 6);
}

function place59(min: number): number {
  return Math.max(5, Math.ceil(min / 5) * 5);
}

function placeAmount(box: Box, min: number): number {
  return box === 6 || box === 8 ? place68(min) : place59(min);
}

export function seedFromCustom(c: CustomStrategy, table: TableRules): OpenBets {
  const b = emptyBets();
  const min = table.min;
  if (c.pass) b.pass = min;
  if (c.dont) b.dont = min;
  if (c.field) b.field = min;
  for (const n of c.place) {
    b.place[n] = placeAmount(n, min);
  }
  return b;
}

export function seedBets(
  id: StrategyId,
  table: TableRules,
  custom?: CustomStrategy | null,
): OpenBets {
  if (custom) return seedFromCustom(custom, table);
  const min = table.min;
  const b = emptyBets();
  if (id === "track") return b;
  if (id === "pass-odds") {
    b.pass = min;
    return b;
  }
  if (id === "dont-pass") {
    b.dont = min;
    return b;
  }
  if (id === "place-68") {
    const p = place68(min);
    b.place = { 6: p, 8: p };
    return b;
  }
  if (id === "iron-cross") {
    const p68 = place68(min);
    const p5 = place59(min);
    b.place = { 5: p5, 6: p68, 8: p68 };
    b.field = min;
    return b;
  }
  return b;
}

export function reseedAfterSevenOut(
  id: StrategyId,
  table: TableRules,
  bets: OpenBets,
  custom?: CustomStrategy | null,
): OpenBets {
  const seed = seedBets(id, table, custom);
  bets.place = seed.place;
  bets.field = seed.field;
  if (seed.pass) bets.pass = seed.pass;
  if (seed.dont) bets.dont = seed.dont;
  return bets;
}

export function lookupCustom(
  id: StrategyId,
  customs: CustomStrategy[],
): CustomStrategy | null {
  if (isBuiltin(id)) return null;
  return customs.find((c) => c.id === id) ?? null;
}

/** Replay a strategy on an existing roll list. Same dice, same table, new P/L. */
export function simulateOnRolls(
  id: StrategyId,
  table: TableRules,
  rolls: Roll[],
  custom?: CustomStrategy | null,
): { pnl: number } {
  let puck = { on: false } as { on: false } | { on: true; point: 4 | 5 | 6 | 8 | 9 | 10 };
  let bets = seedBets(id, table, custom);
  let pnl = 0;
  let shooter = 1;
  for (const r of rolls) {
    const full = { ...r, shooter };
    const { bets: nb, delta, call } = settle(bets, puck, full, table);
    bets = nb;
    pnl += delta;
    puck = call.puck;
    if (call.sevenOut) {
      shooter += 1;
      bets = reseedAfterSevenOut(id, table, bets, custom);
    }
  }
  return { pnl };
}

export function customIsValid(c: Pick<CustomStrategy, "name" | "pass" | "dont" | "field" | "place">): string | null {
  if (!c.name.trim()) return "Name this strategy.";
  if (c.pass && c.dont) return "Pick Pass or Don't Pass, not both.";
  if (!c.pass && !c.dont && !c.field && c.place.length === 0) {
    return "Turn on at least one bet, or use Track only.";
  }
  return null;
}
