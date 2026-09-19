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
import type {
  CustomStrategy,
  Die,
  Goal,
  Roll,
  Session,
  StrategyId,
  TableRules,
  Total,
} from "./types";
import { asTotal } from "./dice";
import { settle } from "./payouts";
import { afterRoll, migrateCustom } from "./strategyEngine";
import {
  lookupCustom,
  reseedAfterSevenOut,
  seedBets,
} from "./strategies";

const KEY = "craps.v1";
const MAX_LIVE = 200;

type Persist = {
  sessions: Session[];
  activeId: string | null;
  customStrategies: CustomStrategy[];
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

function emptyPersist(): Persist {
  return { sessions: [], activeId: null, customStrategies: [] };
}

function load(): Persist {
  if (typeof window === "undefined") return emptyPersist();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyPersist();
    const p = JSON.parse(raw) as Persist;
    if (!Array.isArray(p.sessions)) return emptyPersist();
    return {
      sessions: p.sessions,
      activeId: p.activeId ?? null,
      customStrategies: Array.isArray(p.customStrategies)
        ? p.customStrategies.map(migrateCustom)
        : [],
    };
  } catch {
    return emptyPersist();
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

function seedFor(id: StrategyId, table: TableRules, customs: CustomStrategy[]) {
  return seedBets(id, table, lookupCustom(id, customs));
}

function rebuild(base: Session, rolls: Roll[], customs: CustomStrategy[]): Session {
  const custom = lookupCustom(base.strategyId, customs);
  let puck = { on: false } as Session["puck"];
  let bets = seedBets(base.strategyId, base.table, custom, false);
  let pnl = 0;
  let shooterPnl = 0;
  let shooter = 1;
  let hits: Partial<Record<4 | 5 | 6 | 8 | 9 | 10, number>> = {};
  const stamped: Roll[] = [];
  for (const r of rolls) {
    const full = { ...r, shooter };
    const before = puck;
    const { bets: nb, delta, call } = settle(bets, puck, full, base.table);
    bets = nb;
    pnl += delta;
    shooterPnl += delta;
    puck = call.puck;
    if (custom) {
      const stepped = afterRoll(custom, base.table, bets, before, call, full, hits);
      bets = stepped.bets;
      hits = stepped.hits;
    }
    if (call.sevenOut) {
      shooter += 1;
      shooterPnl = 0;
      hits = {};
      if (!custom) {
        bets = reseedAfterSevenOut(base.strategyId, base.table, bets, custom);
      }
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
  customStrategies: CustomStrategy[];
  active: Session | null;
  start: (input: StartInput) => string;
  end: () => void;
  addPair: (a: Die, b: Die) => void;
  addTotal: (total: Total) => void;
  undo: () => void;
  replaceLast: (a: Die | null, b: Die | null, total: Total) => void;
  setPuck: (on: boolean, point?: 4 | 5 | 6 | 8 | 9 | 10) => void;
  resume: (id: string) => void;
  saveCustom: (input: Omit<CustomStrategy, "id" | "createdAt">) => string;
  deleteCustom: (id: string) => void;
  goalBanner: string | null;
  clearBanner: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, emptyPersist());
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
      const prev = load();
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
        bets: seedFor(input.strategyId, input.table, prev.customStrategies),
        goalHitAt: null,
        lossHitAt: null,
        notes: "",
      };
      commit({
        sessions: [session, ...prev.sessions],
        activeId: id,
        customStrategies: prev.customStrategies,
      });
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
        customStrategies: data.customStrategies,
      });
    },
    [commit, data]
  );

  const applyRoll = useCallback(
    (roll: Omit<Roll, "shooter" | "at">) => {
      patchActive((s) => {
        if (s.rolls.length >= MAX_LIVE) return s;
        const full: Roll = { ...roll, shooter: s.shooter, at: Date.now() };
        const settled = settle(s.bets, s.puck, full, s.table);
        let bets = settled.bets;
        const { delta, call } = settled;
        let shooter = s.shooter;
        let shooterPnl = s.shooterPnl + delta;
        const custom = lookupCustom(s.strategyId, data.customStrategies);
        let hitCounts = s.hitCounts ?? {};
        if (custom) {
          const stepped = afterRoll(custom, s.table, bets, s.puck, call, full, hitCounts);
          bets = stepped.bets;
          hitCounts = stepped.hits;
        }
        if (call.sevenOut) {
          s.lastShooter = s.shooter;
          s.lastShooterPnl = shooterPnl;
          shooter += 1;
          shooterPnl = 0;
          hitCounts = {};
          if (!custom) {
            bets = reseedAfterSevenOut(s.strategyId, s.table, bets, custom);
          }
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
          hitCounts,
          goalHitAt,
          lossHitAt,
        };
      });
    },
    [patchActive, data.customStrategies]
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
      sessions: data.sessions.map((s) =>
        s.id === cur.id ? rebuild(cur, cur.rolls.slice(0, -1), data.customStrategies) : s,
      ),
      activeId: data.activeId,
      customStrategies: data.customStrategies,
    });
  }, [commit, data]);

  const replaceLast = useCallback(
    (a: Die | null, b: Die | null, total: Total) => {
      const cur = activeOf(data);
      if (!cur || cur.rolls.length === 0) return;
      const last = cur.rolls[cur.rolls.length - 1];
      const rolls = [...cur.rolls.slice(0, -1), { ...last, a, b, total }];
      commit({
        sessions: data.sessions.map((s) =>
          s.id === cur.id ? rebuild(cur, rolls, data.customStrategies) : s,
        ),
        activeId: data.activeId,
        customStrategies: data.customStrategies,
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
      customStrategies: data.customStrategies,
    });
    setBanner(null);
  }, [commit, data]);

  const resume = useCallback(
    (id: string) => {
      commit({ ...data, activeId: id });
    },
    [commit, data]
  );

  const saveCustom = useCallback(
    (input: Omit<CustomStrategy, "id" | "createdAt">) => {
      const id = `custom-${uid()}`;
      const next: CustomStrategy = {
        ...input,
        name: input.name.trim(),
        id,
        createdAt: Date.now(),
      };
      commit({
        ...data,
        customStrategies: [next, ...data.customStrategies],
      });
      return id;
    },
    [commit, data]
  );

  const deleteCustom = useCallback(
    (id: string) => {
      commit({
        ...data,
        customStrategies: data.customStrategies.filter((c) => c.id !== id),
      });
    },
    [commit, data]
  );

  const active = useMemo(() => activeOf(data), [data]);

  const value: Store = {
    hydrated: ready,
    sessions: data.sessions,
    customStrategies: data.customStrategies,
    active,
    start,
    end,
    addPair,
    addTotal,
    undo,
    replaceLast,
    setPuck,
    resume,
    saveCustom,
    deleteCustom,
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
