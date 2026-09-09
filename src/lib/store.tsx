"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import type { Die, Goal, Roll, Session, StrategyId, TableRules, Total } from "./types";
import { asTotal } from "./dice";
import { settle } from "./payouts";
import { seedBets } from "./strategies";

const KEY = "craps.v1";
const MAX_LIVE = 200;

type Persist = {
  sessions: Session[];
  activeId: string | null;
};

type StartInput = {
  casino: string;
  buyIn: number;
  unit: number;
  winGoal: Goal | null;
  lossLimit: Goal | null;
  table: TableRules;
  strategyId: StrategyId;
  puckOn: boolean;
  point: 4 | 5 | 6 | 8 | 9 | 10;
};

type Action =
  | { type: "hydrate"; data: Persist }
  | { type: "replace"; data: Persist };

function uid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* insecure http origin */
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function load(): Persist {
  if (typeof window === "undefined") return { sessions: [], activeId: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { sessions: [], activeId: null };
    const p = JSON.parse(raw) as Persist;
    if (!Array.isArray(p.sessions)) return { sessions: [], activeId: null };
    return { sessions: p.sessions, activeId: p.activeId ?? null };
  } catch {
    return { sessions: [], activeId: null };
  }
}

function save(p: Persist) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage blocked */
  }
}

function dollarsFromGoal(g: Goal | null, buyIn: number, unit: number, elapsedMin: number): number | null {
  if (!g) return null;
  if (g.kind === "dollars") return g.value;
  if (g.kind === "percent") return buyIn * (g.value / 100);
  if (g.kind === "units") return unit * g.value;
  if (g.kind === "minutes") return elapsedMin >= g.value ? 0 : null;
  return null;
}

function activeOf(data: Persist): Session | null {
  if (!data.activeId) return null;
  return data.sessions.find((s) => s.id === data.activeId && !s.endedAt) ?? null;
}

function rebuild(base: Session, rolls: Roll[]): Session {
  let puck = { on: false } as Session["puck"];
  let bets = seedBets(base.strategyId, base.table);
  let pnl = 0;
  let shooterPnl = 0;
  let shooter = 1;
  const stamped: Roll[] = [];
  for (const r of rolls) {
    const full = { ...r, shooter };
    const { bets: nb, delta, call } = settle(bets, puck, full, base.table);
    bets = nb;
    pnl += delta;
    shooterPnl += delta;
    puck = call.puck;
    if (call.sevenOut) {
      shooter += 1;
      shooterPnl = 0;
      bets.place = seedBets(base.strategyId, base.table).place;
      bets.field = seedBets(base.strategyId, base.table).field;
      if (base.strategyId === "pass-odds") bets.pass = base.table.min;
      if (base.strategyId === "dont-pass") bets.dont = base.table.min;
    }
    stamped.push(full);
  }
  return {
    ...base,
    rolls: stamped,
    puck,
    bets,
    pnl,
    shooterPnl,
    shooter,
    bankroll: base.buyIn + pnl,
  };
}

function reducer(state: Persist, action: Action): Persist {
  if (action.type === "hydrate" || action.type === "replace") return action.data;
  return state;
}

type Store = {
  hydrated: boolean;
  sessions: Session[];
  active: Session | null;
  start: (input: StartInput) => string;
  end: () => void;
  addPair: (a: Die, b: Die) => void;
  addTotal: (total: Total) => void;
  undo: () => void;
  replaceLast: (a: Die | null, b: Die | null, total: Total) => void;
  setPuck: (on: boolean, point?: 4 | 5 | 6 | 8 | 9 | 10) => void;
  resume: (id: string) => void;
  goalBanner: string | null;
  clearBanner: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, { sessions: [], activeId: null });
  const [ready, setReady] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    const p = load();
    dispatch({ type: "hydrate", data: p });
    setReady(true);
  }, []);

  const commit = useCallback((next: Persist) => {
    save(next);
    dispatch({ type: "replace", data: next });
  }, []);

  const start = useCallback(
    (input: StartInput) => {
      const id = uid();
      const session: Session = {
        id,
        casino: input.casino,
        startedAt: Date.now(),
        endedAt: null,
        buyIn: input.buyIn,
        unit: input.unit,
        winGoal: input.winGoal,
        lossLimit: input.lossLimit,
        table: input.table,
        strategyId: input.strategyId,
        puck: input.puckOn ? { on: true, point: input.point } : { on: false },
        rolls: [],
        shooter: 1,
        pnl: 0,
        shooterPnl: 0,
        bankroll: input.buyIn,
        bets: seedBets(input.strategyId, input.table),
        goalHitAt: null,
        lossHitAt: null,
        notes: "",
      };
      const prev = load();
      commit({ sessions: [session, ...prev.sessions], activeId: id });
      setBanner(null);
      return id;
    },
    [commit]
  );

  const patchActive = useCallback(
    (fn: (s: Session) => Session) => {
      const cur = activeOf(data);
      if (!cur) return;
      const nextS = fn(cur);
      commit({
        sessions: data.sessions.map((s) => (s.id === cur.id ? nextS : s)),
        activeId: data.activeId,
      });
    },
    [commit, data]
  );

  const applyRoll = useCallback(
    (roll: Omit<Roll, "shooter" | "at">) => {
      patchActive((s) => {
        if (s.rolls.length >= MAX_LIVE) return s;
        const full: Roll = { ...roll, shooter: s.shooter, at: Date.now() };
        const { bets, delta, call } = settle(s.bets, s.puck, full, s.table);
        let shooter = s.shooter;
        let shooterPnl = s.shooterPnl + delta;
        if (call.sevenOut) {
          s.lastShooter = s.shooter;
          s.lastShooterPnl = shooterPnl;
          shooter += 1;
          shooterPnl = 0;
          bets.place = seedBets(s.strategyId, s.table).place;
          bets.field = seedBets(s.strategyId, s.table).field;
          if (s.strategyId === "pass-odds") bets.pass = s.table.min;
          if (s.strategyId === "dont-pass") bets.dont = s.table.min;
        }
        const pnl = s.pnl + delta;
        const elapsed = (Date.now() - s.startedAt) / 60000;
        let goalHitAt = s.goalHitAt;
        let lossHitAt = s.lossHitAt;
        let nextBanner: string | null = null;
        const winNeed = dollarsFromGoal(s.winGoal, s.buyIn, s.unit, elapsed);
        const lossNeed = dollarsFromGoal(s.lossLimit, s.buyIn, s.unit, elapsed);
        if (!goalHitAt && winNeed != null && s.winGoal?.kind === "minutes" && elapsed >= s.winGoal.value) {
          goalHitAt = Date.now();
          nextBanner = "Time goal — check your stack.";
        } else if (!goalHitAt && winNeed != null && s.winGoal?.kind !== "minutes" && pnl >= winNeed) {
          goalHitAt = Date.now();
          nextBanner = "Goal hit — walk.";
        }
        if (!lossHitAt && lossNeed != null && s.lossLimit?.kind !== "minutes" && pnl <= -Math.abs(lossNeed)) {
          lossHitAt = Date.now();
          nextBanner = "Loss limit — walk.";
        }
        if (nextBanner) {
          setBanner(nextBanner);
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([90, 50, 90]);
        }
        return {
          ...s,
          rolls: [...s.rolls, full],
          puck: call.puck,
          bets,
          pnl,
          shooterPnl,
          bankroll: s.buyIn + pnl,
          shooter,
          goalHitAt,
          lossHitAt,
        };
      });
    },
    [patchActive]
  );

  const addPair = useCallback((a: Die, b: Die) => {
    applyRoll({ a, b, total: asTotal(a + b) });
  }, [applyRoll]);

  const addTotal = useCallback((total: Total) => {
    applyRoll({ a: null, b: null, total });
  }, [applyRoll]);

  const undo = useCallback(() => {
    const cur = activeOf(data);
    if (!cur || cur.rolls.length === 0) return;
    commit({
      sessions: data.sessions.map((s) => (s.id === cur.id ? rebuild(cur, cur.rolls.slice(0, -1)) : s)),
      activeId: data.activeId,
    });
  }, [commit, data]);

  const replaceLast = useCallback(
    (a: Die | null, b: Die | null, total: Total) => {
      const cur = activeOf(data);
      if (!cur || cur.rolls.length === 0) return;
      const last = cur.rolls[cur.rolls.length - 1];
      const rolls = [...cur.rolls.slice(0, -1), { ...last, a, b, total }];
      commit({
        sessions: data.sessions.map((s) => (s.id === cur.id ? rebuild(cur, rolls) : s)),
        activeId: data.activeId,
      });
    },
    [commit, data]
  );

  const setPuck = useCallback(
    (on: boolean, point?: 4 | 5 | 6 | 8 | 9 | 10) => {
      patchActive((s) => ({
        ...s,
        puck: on && point ? { on: true, point } : { on: false },
      }));
    },
    [patchActive]
  );

  const end = useCallback(() => {
    const cur = activeOf(data);
    if (!cur) return;
    commit({
      sessions: data.sessions.map((s) => (s.id === cur.id ? { ...s, endedAt: Date.now() } : s)),
      activeId: null,
    });
    setBanner(null);
  }, [commit, data]);

  const resume = useCallback(
    (id: string) => {
      commit({ ...data, activeId: id });
    },
    [commit, data]
  );

  const active = useMemo(() => activeOf(data), [data]);

  const value: Store = {
    hydrated: ready,
    sessions: data.sessions,
    active,
    start,
    end,
    addPair,
    addTotal,
    undo,
    replaceLast,
    setPuck,
    resume,
    goalBanner: banner,
    clearBanner: () => setBanner(null),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("store");
  return v;
}
