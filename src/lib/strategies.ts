import type {
  BuiltinStrategyId,
  CustomStrategy,
  OpenBets,
  Roll,
  StrategyId,
  TableRules,
} from "./types";
import { emptyBets, settle } from "./payouts";
import {
  afterRoll,
  describeCustom as describePlan,
  migrateCustom,
  seedFromPlan,
} from "./strategyEngine";

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
  return describePlan(c);
}

function place68(min: number): number {
  return Math.max(6, Math.ceil(min / 6) * 6);
}

function place59(min: number): number {
  return Math.max(5, Math.ceil(min / 5) * 5);
}

export function seedFromCustom(c: CustomStrategy, table: TableRules, puckOn = false): OpenBets {
  return seedFromPlan(c, table, puckOn);
}

export function seedBets(
  id: StrategyId,
  table: TableRules,
  custom?: CustomStrategy | null,
  puckOn = false,
): OpenBets {
  if (custom) return seedFromCustom(custom, table, puckOn);
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
  const seed = seedBets(id, table, custom, false);
  bets.place = seed.place;
  bets.field = seed.field;
  bets.pass = seed.pass;
  bets.dont = seed.dont;
  bets.passOdds = 0;
  bets.dontOdds = 0;
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
  let bets = seedBets(id, table, custom, false);
  let pnl = 0;
  let shooter = 1;
  let hits: Partial<Record<4 | 5 | 6 | 8 | 9 | 10, number>> = {};
  for (const r of rolls) {
    const full = { ...r, shooter };
    const before = puck;
    const { bets: nb, delta, call } = settle(bets, puck, full, table);
    bets = nb;
    pnl += delta;
    puck = call.puck;
    if (custom) {
      const stepped = afterRoll(custom, table, bets, before, call, full, hits);
      bets = stepped.bets;
      hits = stepped.hits;
    } else if (call.sevenOut) {
      shooter += 1;
      bets = reseedAfterSevenOut(id, table, bets, custom);
    }
    if (call.sevenOut) {
      shooter += 1;
      hits = {};
    }
  }
  return { pnl };
}

export function customIsValid(c: CustomStrategy | Omit<CustomStrategy, "id" | "createdAt">): string | null {
  const m = migrateCustom(c as CustomStrategy);
  if (!m.name.trim()) return "Name this strategy.";
  const bets = m.comeout.length + m.point.length;
  const legacy = m.pass || m.dont || m.field || (m.place && m.place.length > 0);
  if (!bets && !legacy && m.rules.length === 0) {
    return "Add a starting bet or an if/when rule, or use Track only.";
  }
  return null;
}
