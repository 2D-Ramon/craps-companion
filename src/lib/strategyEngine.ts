import type {
  ActionKind,
  BetKind,
  BetPhase,
  Box,
  CustomStrategy,
  OpenBets,
  Puck,
  Roll,
  StartBet,
  StrategyAction,
  StrategyRule,
  StrategyWhen,
  TableRules,
  WhenKind,
} from "./types";
import { emptyBets } from "./payouts";
import type { RollCall } from "./puck";

const BOXES: Box[] = [4, 5, 6, 8, 9, 10];

export function rid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyCustom(name = ""): Omit<CustomStrategy, "id" | "createdAt"> {
  return {
    name,
    instructions: [],
    comeout: [],
    point: [],
    rules: [],
    pass: false,
    dont: false,
    field: false,
    place: [],
  };
}

export function migrateCustom(c: CustomStrategy): CustomStrategy {
  const comeout = Array.isArray(c.comeout) ? c.comeout : [];
  const point = Array.isArray(c.point) ? c.point : [];
  const rules = Array.isArray(c.rules) ? c.rules : [];
  const instructions = Array.isArray(c.instructions) ? c.instructions : [];
  if (comeout.length || point.length) {
    return { ...c, comeout, point, rules, instructions };
  }
  const nextCome: StartBet[] = [];
  const nextPoint: StartBet[] = [];
  if (c.pass) {
    nextCome.push(startBet("pass", "comeout", { odds: true }));
  }
  if (c.dont) {
    nextCome.push(startBet("dont", "comeout", { odds: true }));
  }
  if (c.field) {
    nextPoint.push(startBet("field", "point"));
  }
  for (const n of c.place ?? []) {
    nextPoint.push(startBet("place", "point", { number: n }));
  }
  return {
    ...c,
    comeout: nextCome,
    point: nextPoint,
    rules,
    instructions,
  };
}

export function startBet(
  kind: BetKind,
  phase: BetPhase,
  extra: Partial<StartBet> = {},
): StartBet {
  return {
    id: rid(),
    kind,
    phase,
    workingComeout: extra.workingComeout ?? false,
    odds: extra.odds ?? (kind === "pass" || kind === "dont" || kind === "come"),
    units: extra.units ?? 1,
    number: extra.number,
  };
}

export function kindLabel(kind: BetKind, number?: number): string {
  if (kind === "pass") return "Pass line";
  if (kind === "dont") return "Don't Pass";
  if (kind === "field") return "Field";
  if (kind === "come") return "Come";
  if (kind === "hard") return `Hard ${number ?? ""}`.trim();
  return `Place ${number ?? ""}`.trim();
}

export function phaseLabel(p: BetPhase): string {
  if (p === "comeout") return "Come out";
  if (p === "point") return "Point is on";
  return "Always";
}

export function whenLabel(w: StrategyWhen): string {
  if (w.kind === "comeout") return "On come out";
  if (w.kind === "pointOn") return "While point is on";
  if (w.kind === "pointSet") return "When the point is set";
  if (w.kind === "pointMade") return "When the point is made";
  if (w.kind === "sevenOut") return "On seven-out";
  if (w.kind === "hit") return `If ${w.number ?? "a number"} hits`;
  if (w.kind === "hitsCount") {
    return `After ${w.hits ?? 2} hits on ${w.number ?? "a number"}`;
  }
  if (w.kind === "roll") return `If the roll is ${w.number ?? "?"}`;
  return "When";
}

export function actionLabel(a: StrategyAction): string {
  const tgt =
    a.target === "this"
      ? "that bet"
      : a.target === "all"
        ? "all bets"
        : kindLabel(a.target, a.number);
  if (a.kind === "press") return `Press ${tgt}`;
  if (a.kind === "powerPress") return `Power press ${tgt}`;
  if (a.kind === "regress") return `Regress ${tgt} to min`;
  if (a.kind === "decrease") return `Decrease ${tgt}`;
  if (a.kind === "sameBet") return `Same bet / collect ${tgt}`;
  if (a.kind === "takeDown") return `Take down ${tgt}`;
  if (a.kind === "putUp") return `Put up ${tgt}`;
  if (a.kind === "off") return `Mark ${tgt} off`;
  if (a.kind === "working") return `Mark ${tgt} working`;
  if (a.kind === "reset") return "Reset to starting bets";
  return a.kind;
}

export function ruleLine(r: StrategyRule): string {
  return `${whenLabel(r.when)} → ${actionLabel(r.action)}`;
}

export function describeCustom(c: CustomStrategy): string {
  const m = migrateCustom(c);
  const bets = [...m.comeout, ...m.point].map((b) =>
    `${kindLabel(b.kind, b.number)} (${phaseLabel(b.phase)})`,
  );
  const bits = [...bets];
  if (m.rules.length) bits.push(`${m.rules.length} if/when rule${m.rules.length === 1 ? "" : "s"}`);
  if (!bits.length && m.pass) bits.push("Pass + odds");
  if (!bits.length && (m.place?.length || m.field)) {
    if (m.place?.length) bits.push(`Place ${m.place.join(", ")}`);
    if (m.field) bits.push("Field");
  }
  return bits.length ? bits.join(" · ") : "No auto bets";
}

function placeUnit(box: Box, min: number): number {
  if (box === 6 || box === 8) return Math.max(6, Math.ceil(min / 6) * 6);
  return Math.max(5, Math.ceil(min / 5) * 5);
}

export function betAmount(b: StartBet, table: TableRules): number {
  const u = Math.max(1, b.units || 1);
  if (b.kind === "place" && b.number) return placeUnit(b.number, table.min) * u;
  return table.min * u;
}

function applyStartList(bets: OpenBets, list: StartBet[], table: TableRules, puckOn: boolean) {
  for (const b of list) {
    const onComeout = !puckOn;
    if (b.phase === "point" && onComeout) continue;
    if (b.phase === "comeout" && puckOn && b.kind !== "pass" && b.kind !== "dont") continue;
    if (b.kind === "place" && onComeout && !b.workingComeout && b.phase !== "comeout" && b.phase !== "always") {
      continue;
    }
    const amt = betAmount(b, table);
    if (b.kind === "pass") bets.pass = amt;
    if (b.kind === "dont") bets.dont = amt;
    if (b.kind === "field") bets.field = amt;
    if (b.kind === "place" && b.number) bets.place[b.number] = amt;
  }
}

export function seedFromPlan(c: CustomStrategy, table: TableRules, puckOn: boolean): OpenBets {
  const m = migrateCustom(c);
  const bets = emptyBets();
  if (!m.comeout.length && !m.point.length) {
    if (m.pass) bets.pass = table.min;
    if (m.dont) bets.dont = table.min;
    if (m.field && puckOn) bets.field = table.min;
    for (const n of m.place ?? []) {
      if (puckOn) bets.place[n] = placeUnit(n, table.min);
    }
    return bets;
  }
  applyStartList(bets, m.comeout, table, puckOn);
  applyStartList(bets, m.point, table, puckOn);
  return bets;
}

export function mergeStartBets(into: OpenBets, list: StartBet[], table: TableRules, puckOn: boolean) {
  applyStartList(into, list, table, puckOn);
}

function bumpPlace(bets: OpenBets, box: Box, table: TableRules, mult: number) {
  const cur = bets.place[box] ?? 0;
  const u = placeUnit(box, table.min);
  const next = Math.max(u, cur + u * mult);
  bets.place[box] = next;
}

function shrinkPlace(bets: OpenBets, box: Box, table: TableRules, toMin: boolean) {
  const u = placeUnit(box, table.min);
  const cur = bets.place[box] ?? 0;
  if (!cur) return;
  bets.place[box] = toMin ? u : Math.max(u, cur - u);
}

function matchWhen(
  w: StrategyWhen,
  puckBefore: Puck,
  call: RollCall,
  roll: Roll,
  hits: Partial<Record<Box, number>>,
): boolean {
  if (w.kind === "comeout") return !puckBefore.on;
  if (w.kind === "pointOn") return puckBefore.on;
  if (w.kind === "pointSet") return !puckBefore.on && call.puck.on;
  if (w.kind === "pointMade") return Boolean(call.pointMade);
  if (w.kind === "sevenOut") return Boolean(call.sevenOut);
  if (w.kind === "roll") return roll.total === w.number;
  if (w.kind === "hit") {
    const n = w.number as Box | undefined;
    if (!n || !BOXES.includes(n)) return BOXES.includes(roll.total as Box);
    return roll.total === n;
  }
  if (w.kind === "hitsCount") {
    const n = w.number as Box | undefined;
    if (!n) return false;
    return (hits[n] ?? 0) >= (w.hits ?? 2) && roll.total === n;
  }
  return false;
}

function applyAction(
  a: StrategyAction,
  bets: OpenBets,
  table: TableRules,
  hitBox: Box | null,
  custom: CustomStrategy,
  puckOn: boolean,
) {
  const box = (a.number ?? hitBox) as Box | null;
  if (a.kind === "reset") {
    const fresh = seedFromPlan(custom, table, puckOn);
    bets.pass = fresh.pass;
    bets.dont = fresh.dont;
    bets.field = fresh.field;
    bets.place = fresh.place;
    bets.passOdds = puckOn ? bets.passOdds : 0;
    bets.dontOdds = puckOn ? bets.dontOdds : 0;
    return;
  }
  if (a.kind === "takeDown") {
    if (a.target === "field" || a.target === "all") bets.field = 0;
    if (a.target === "pass") bets.pass = 0;
    if (a.target === "dont") bets.dont = 0;
    if ((a.target === "place" || a.target === "this" || a.target === "all") && box) {
      delete bets.place[box];
    }
    if (a.target === "all") bets.place = {};
    return;
  }
  if (a.kind === "putUp" && box) {
    bets.place[box] = placeUnit(box, table.min) * (a.units ?? 1);
    return;
  }
  if ((a.kind === "press" || a.kind === "powerPress") && box) {
    bumpPlace(bets, box, table, a.kind === "powerPress" ? 2 : 1);
    return;
  }
  if (a.kind === "regress" && box) {
    shrinkPlace(bets, box, table, true);
    return;
  }
  if (a.kind === "decrease" && box) {
    shrinkPlace(bets, box, table, false);
  }
}

export type HitMap = Partial<Record<Box, number>>;

export function afterRoll(
  custom: CustomStrategy,
  table: TableRules,
  bets: OpenBets,
  puckBefore: Puck,
  call: RollCall,
  roll: Roll,
  hits: HitMap,
): { bets: OpenBets; hits: HitMap } {
  const m = migrateCustom(custom);
  const next: OpenBets = {
    ...bets,
    place: { ...bets.place },
  };
  const nextHits: HitMap = { ...hits };
  const box = roll.total as Box;
  const isBox = BOXES.includes(box);

  if (puckBefore.on && isBox && (next.place[box] ?? 0) > 0) {
    nextHits[box] = (nextHits[box] ?? 0) + 1;
  }

  if (!puckBefore.on && call.puck.on) {
    applyStartList(next, m.point, table, true);
  }

  for (const rule of m.rules) {
    if (!matchWhen(rule.when, puckBefore, call, roll, nextHits)) continue;
    applyAction(
      rule.action,
      next,
      table,
      isBox ? box : null,
      m,
      call.puck.on,
    );
  }

  if (call.sevenOut) {
    return {
      bets: seedFromPlan(m, table, false),
      hits: {},
    };
  }

  return { bets: next, hits: nextHits };
}

export const WHEN_OPTIONS: { id: WhenKind; label: string }[] = [
  { id: "comeout", label: "On come out" },
  { id: "pointSet", label: "When point is set" },
  { id: "pointOn", label: "While point is on" },
  { id: "hit", label: "If a number hits" },
  { id: "hitsCount", label: "After N hits on a number" },
  { id: "roll", label: "If the roll is" },
  { id: "pointMade", label: "When point is made" },
  { id: "sevenOut", label: "On seven-out" },
];

export const ACTION_OPTIONS: { id: ActionKind; label: string }[] = [
  { id: "press", label: "Press (increase)" },
  { id: "powerPress", label: "Power press" },
  { id: "decrease", label: "Decrease" },
  { id: "regress", label: "Regress to min" },
  { id: "sameBet", label: "Same bet / collect" },
  { id: "takeDown", label: "Take down" },
  { id: "putUp", label: "Put up" },
  { id: "off", label: "Mark off" },
  { id: "working", label: "Mark working" },
  { id: "reset", label: "Reset to start bets" },
];
