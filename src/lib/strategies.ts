import type { OpenBets, StrategyId, TableRules } from "./types";
import { emptyBets } from "./payouts";

export const STRATEGY_LABEL: Record<StrategyId, string> = {
  track: "Track only",
  "pass-odds": "Pass + odds",
  "place-68": "Place 6 & 8",
  "iron-cross": "Iron Cross",
  "dont-pass": "Don't Pass + odds",
};

export const STRATEGY_BLURB: Record<StrategyId, string> = {
  track: "Log rolls and stats. No auto bets.",
  "pass-odds": "Pass line at table min, odds 3-4-5x when the point is on.",
  "place-68": "Place 6 and 8 (inside) and collect.",
  "iron-cross": "Place 5, 6, 8 plus a field bet. Covers everything but 7.",
  "dont-pass": "Don't Pass at table min, lay odds when the point is on.",
};

function place68(min: number): number {
  const u = Math.max(6, Math.ceil(min / 6) * 6);
  return u;
}

function place59(min: number): number {
  const u = Math.max(5, Math.ceil(min / 5) * 5);
  return u;
}

export function seedBets(id: StrategyId, table: TableRules): OpenBets {
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

export const STRATEGIES: StrategyId[] = [
  "track",
  "pass-odds",
  "place-68",
  "iron-cross",
  "dont-pass",
];
