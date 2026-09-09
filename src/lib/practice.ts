"use client";

import { useCallback, useSyncExternalStore } from "react";
import { asTotal, trueDie, truePair } from "./dice";
import { buyPays, dontOddsPays, fieldPays, layPays, passOddsPays, placePays } from "./payouts";
import { isBox } from "./puck";
import type {
  Box,
  Die,
  HardWay,
  PracticeBets,
  PracticeSpot,
  PracticeState,
  Roll,
  TableRules,
  Total,
} from "./types";

const KEY = "craps.practice.v2";
const MAX_ROLLS = 72;
const MAX_LOG = 30;
const BOXES: Box[] = [4, 5, 6, 8, 9, 10];
const HARD: HardWay[] = [4, 6, 8, 10];
const ACROSS: Box[] = [4, 5, 6, 8, 9, 10];
const OUTSIDE: Box[] = [4, 5, 9, 10];
const INSIDE: Box[] = [5, 6, 8, 9];

export const PRACTICE_TABLE: TableRules = {
  min: 5,
  fieldTwo: 2,
  fieldTwelve: 3,
  odds: "3-4-5x",
  vigUpFront: false,
};

export const CHIP_VALUES = [1, 5, 10, 25, 100, 500] as const;
export const TABLE_MINS = [5, 10, 15, 25] as const;

/** Place 6/8 in $6 units so 7:6 pays a whole dollar. $5 → $6, $10 → $12. */
export function placeIncrement(box: Box, chip: number): number {
  const n = Math.max(1, Math.round(chip));
  if (box === 6 || box === 8) return Math.max(6, Math.round((n * 6) / 5));
  return n;
}

/**
 * Lay is the opposite of place: you bet more than you win, and the WIN must
 * meet the table min. 4/10 pays 1:2, 5/9 pays 2:3, 6/8 pays 5:6.
 * $5 min → lay 4/10 $10, 5/9 $9, 6/8 $6.
 */
export function layIncrement(box: Box, chip: number): number {
  const n = Math.max(1, Math.round(chip));
  if (box === 4 || box === 10) return Math.max(2, n * 2);
  if (box === 5 || box === 9) return Math.max(3, Math.ceil((n * 3) / 2 / 3) * 3);
  return Math.max(6, Math.ceil((n * 6) / 5 / 6) * 6);
}

export function layMinBet(box: Box, tableMin: number): number {
  return layIncrement(box, tableMin);
}

/** 3-4-5x: pass/come odds max. Don't/DC odds max is 6x the line (same win cap). */
export function maxOdds(point: Box, line: number, laying: boolean): number {
  const flat = Math.max(0, line);
  if (laying) return flat * 6;
  if (point === 4 || point === 10) return flat * 3;
  if (point === 5 || point === 9) return flat * 4;
  return flat * 5;
}

export function emptyPracticeBets(): PracticeBets {
  return {
    pass: 0,
    passOdds: 0,
    dont: 0,
    dontOdds: 0,
    come: 0,
    comeOn: { 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 },
    comeOddsOn: { 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 },
    dc: 0,
    dcOn: { 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 },
    dcOddsOn: { 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 },
    place: { 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 },
    buy: { 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 },
    lay: { 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 },
    layOdds: { 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 },
    field: 0,
    hard: { 4: 0, 6: 0, 8: 0, 10: 0 },
    any7: 0,
    anyCraps: 0,
    yo: 0,
    two: 0,
    three: 0,
    twelve: 0,
    horn: 0,
    ce: 0,
    threeWay: 0,
    world: 0,
    hornHigh2: 0,
    hornHigh3: 0,
    hornHigh11: 0,
    hornHigh12: 0,
    big6: 0,
    big8: 0,
  };
}

export function defaultPractice(): PracticeState {
  return {
    bank: 300,
    buyIn: 300,
    tableMin: 5,
    chip: 5,
    take: false,
    paused: false,
    puck: { on: false },
    bets: emptyPracticeBets(),
    rolls: [],
    log: [],
    shooter: 1,
    shooterPnl: 0,
    lastShooterPnl: 0,
    lastRepeat: null,
    last: null,
    lastDelta: 0,
    msg: "",
  };
}

function cloneBets(b: PracticeBets): PracticeBets {
  const empty = emptyPracticeBets();
  return {
    ...empty,
    ...b,
    place: { ...empty.place, ...(b.place || {}) },
    buy: { ...empty.buy, ...(b.buy || {}) },
    lay: { ...empty.lay, ...(b.lay || {}) },
    layOdds: { ...empty.layOdds, ...(b.layOdds || {}) },
    comeOn: { ...empty.comeOn, ...(b.comeOn || {}) },
    comeOddsOn: { ...empty.comeOddsOn, ...(b.comeOddsOn || {}) },
    dcOn: { ...empty.dcOn, ...(b.dcOn || {}) },
    dcOddsOn: { ...empty.dcOddsOn, ...(b.dcOddsOn || {}) },
    hard: { ...empty.hard, ...(b.hard || {}) },
  };
}

export function betsOnTable(b: PracticeBets): number {
  let n =
    b.pass +
    b.passOdds +
    b.dont +
    b.dontOdds +
    b.come +
    b.dc +
    b.field +
    b.any7 +
    b.anyCraps +
    b.yo +
    b.two +
    b.three +
    b.twelve +
    b.horn +
    b.ce +
    b.threeWay +
    b.world +
    b.hornHigh2 +
    b.hornHigh3 +
    b.hornHigh11 +
    b.hornHigh12 +
    b.big6 +
    b.big8;
  for (const box of BOXES) {
    n += b.place[box] || 0;
    n += b.buy[box] || 0;
    n += b.lay[box] || 0;
    n += b.layOdds[box] || 0;
    n += b.comeOn[box] || 0;
    n += b.comeOddsOn[box] || 0;
    n += b.dcOn[box] || 0;
    n += b.dcOddsOn[box] || 0;
  }
  for (const h of HARD) n += b.hard[h] || 0;
  return n;
}

export function spotAmount(b: PracticeBets, spot: PracticeSpot): number {
  if (spot.startsWith("place")) {
    const n = Number(spot.replace("place", "")) as Box;
    return b.place[n] || 0;
  }
  if (spot.startsWith("buy")) {
    const n = Number(spot.replace("buy", "")) as Box;
    return b.buy[n] || 0;
  }
  if (spot.startsWith("layOdds")) {
    const n = Number(spot.replace("layOdds", "")) as Box;
    return b.layOdds[n] || 0;
  }
  if (spot.startsWith("lay")) {
    const n = Number(spot.replace("lay", "")) as Box;
    return b.lay[n] || 0;
  }
  if (spot.startsWith("comeOdds")) {
    const n = Number(spot.replace("comeOdds", "")) as Box;
    return b.comeOddsOn[n] || 0;
  }
  if (spot.startsWith("comeOn")) {
    const n = Number(spot.replace("comeOn", "")) as Box;
    return b.comeOn[n] || 0;
  }
  if (spot.startsWith("dcOdds")) {
    const n = Number(spot.replace("dcOdds", "")) as Box;
    return b.dcOddsOn[n] || 0;
  }
  if (spot.startsWith("dcOn")) {
    const n = Number(spot.replace("dcOn", "")) as Box;
    return b.dcOn[n] || 0;
  }
  if (spot.startsWith("hard")) {
    const n = Number(spot.replace("hard", "")) as HardWay;
    return b.hard[n] || 0;
  }
  if (spot === "pass") return b.pass;
  if (spot === "passOdds") return b.passOdds;
  if (spot === "dont") return b.dont;
  if (spot === "dontOdds") return b.dontOdds;
  if (spot === "come") return b.come;
  if (spot === "dc") return b.dc;
  if (spot === "field") return b.field;
  if (spot === "any7") return b.any7;
  if (spot === "anyCraps") return b.anyCraps;
  if (spot === "yo") return b.yo;
  if (spot === "two") return b.two;
  if (spot === "three") return b.three;
  if (spot === "twelve") return b.twelve;
  if (spot === "horn") return b.horn;
  if (spot === "ce") return b.ce;
  if (spot === "threeWay") return b.threeWay;
  if (spot === "world") return b.world;
  if (spot === "hornHigh2") return b.hornHigh2;
  if (spot === "hornHigh3") return b.hornHigh3;
  if (spot === "hornHigh11") return b.hornHigh11;
  if (spot === "hornHigh12") return b.hornHigh12;
  if (spot === "big6") return b.big6;
  if (spot === "big8") return b.big8;
  return 0;
}

function addToSpot(b: PracticeBets, spot: PracticeSpot, n: number) {
  if (spot.startsWith("place")) {
    const box = Number(spot.replace("place", "")) as Box;
    b.place[box] = Math.max(0, (b.place[box] || 0) + n);
    return;
  }
  if (spot.startsWith("buy")) {
    const box = Number(spot.replace("buy", "")) as Box;
    b.buy[box] = Math.max(0, (b.buy[box] || 0) + n);
    return;
  }
  if (spot.startsWith("layOdds")) {
    const box = Number(spot.replace("layOdds", "")) as Box;
    b.layOdds[box] = Math.max(0, (b.layOdds[box] || 0) + n);
    return;
  }
  if (spot.startsWith("lay")) {
    const box = Number(spot.replace("lay", "")) as Box;
    b.lay[box] = Math.max(0, (b.lay[box] || 0) + n);
    return;
  }
  if (spot.startsWith("comeOdds")) {
    const box = Number(spot.replace("comeOdds", "")) as Box;
    b.comeOddsOn[box] = Math.max(0, (b.comeOddsOn[box] || 0) + n);
    return;
  }
  if (spot.startsWith("comeOn")) {
    const box = Number(spot.replace("comeOn", "")) as Box;
    b.comeOn[box] = Math.max(0, (b.comeOn[box] || 0) + n);
    return;
  }
  if (spot.startsWith("dcOdds")) {
    const box = Number(spot.replace("dcOdds", "")) as Box;
    b.dcOddsOn[box] = Math.max(0, (b.dcOddsOn[box] || 0) + n);
    return;
  }
  if (spot.startsWith("dcOn")) {
    const box = Number(spot.replace("dcOn", "")) as Box;
    b.dcOn[box] = Math.max(0, (b.dcOn[box] || 0) + n);
    return;
  }
  if (spot.startsWith("hard")) {
    const h = Number(spot.replace("hard", "")) as HardWay;
    b.hard[h] = Math.max(0, (b.hard[h] || 0) + n);
    return;
  }
  const rec = b as unknown as Record<string, number>;
  rec[spot] = Math.max(0, (rec[spot] || 0) + n);
}

function payLay(p: PracticeState, n: Box) {
  const bets = p.bets;
  if (bets.lay[n]) profit(p, layPays(n, bets.lay[n]));
  if (bets.layOdds[n]) profit(p, dontOddsPays(n, bets.layOdds[n]));
}

function loseLay(p: PracticeState, n: Box) {
  const bets = p.bets;
  const stake = (bets.lay[n] || 0) + (bets.layOdds[n] || 0);
  if (!stake) return;
  drop(p, stake);
  bets.lay[n] = 0;
  bets.layOdds[n] = 0;
}

function hopOdds(total: Total): number {
  return total === 2 || total === 12 ? 30 : 15;
}

function resolveSplit(
  p: PracticeState,
  amt: number,
  t: Total,
  parts: { total: Total; units: number; odds: number }[],
  unitCount: number
) {
  const u = amt / unitCount;
  const hit = parts.find((x) => x.total === t);
  if (hit) {
    profit(p, u * hit.units * hit.odds);
    returnStake(p, u * hit.units);
    drop(p, amt - u * hit.units);
  } else {
    drop(p, amt);
  }
}

function profit(p: PracticeState, n: number) {
  p.bank += n;
  p.lastDelta += n;
}

function returnStake(p: PracticeState, n: number) {
  p.bank += n;
}

function drop(p: PracticeState, amount: number) {
  p.lastDelta -= amount;
}

export function settlePractice(state: PracticeState, a: Die, b: Die, t: Total): PracticeState {
  const p: PracticeState = {
    ...state,
    bets: cloneBets(state.bets),
    lastDelta: 0,
    last: { a, b, total: t },
    msg: "",
  };
  const bets = p.bets;
  const hardHit = a === b && (t === 4 || t === 6 || t === 8 || t === 10);

  if (bets.any7) {
    if (t === 7) profit(p, bets.any7 * 4);
    else drop(p, bets.any7);
    if (t === 7) returnStake(p, bets.any7);
    bets.any7 = 0;
  }
  if (bets.anyCraps) {
    if (t === 2 || t === 3 || t === 12) {
      profit(p, bets.anyCraps * 7);
      returnStake(p, bets.anyCraps);
    } else drop(p, bets.anyCraps);
    bets.anyCraps = 0;
  }
  if (bets.yo) {
    if (t === 11) {
      profit(p, bets.yo * 15);
      returnStake(p, bets.yo);
    } else drop(p, bets.yo);
    bets.yo = 0;
  }
  if (bets.two) {
    if (t === 2) {
      profit(p, bets.two * 30);
      returnStake(p, bets.two);
    } else drop(p, bets.two);
    bets.two = 0;
  }
  if (bets.three) {
    if (t === 3) {
      profit(p, bets.three * 15);
      returnStake(p, bets.three);
    } else drop(p, bets.three);
    bets.three = 0;
  }
  if (bets.twelve) {
    if (t === 12) {
      profit(p, bets.twelve * 30);
      returnStake(p, bets.twelve);
    } else drop(p, bets.twelve);
    bets.twelve = 0;
  }
  if (bets.horn) {
    const u = bets.horn / 4;
    if (t === 2 || t === 12) {
      profit(p, u * 30);
      returnStake(p, u);
      drop(p, bets.horn - u);
    } else if (t === 3 || t === 11) {
      profit(p, u * 15);
      returnStake(p, u);
      drop(p, bets.horn - u);
    } else drop(p, bets.horn);
    bets.horn = 0;
  }
  if (bets.ce) {
    const u = bets.ce / 2;
    if (t === 2 || t === 3 || t === 12) {
      profit(p, u * 7);
      returnStake(p, u);
      drop(p, u);
    } else if (t === 11) {
      profit(p, u * 15);
      returnStake(p, u);
      drop(p, u);
    } else drop(p, bets.ce);
    bets.ce = 0;
  }
  if (bets.threeWay) {
    resolveSplit(
      p,
      bets.threeWay,
      t,
      [
        { total: 2, units: 1, odds: 30 },
        { total: 3, units: 1, odds: 15 },
        { total: 12, units: 1, odds: 30 },
      ],
      3
    );
    bets.threeWay = 0;
  }
  if (bets.world) {
    const u = bets.world / 5;
    if (t === 7) {
      profit(p, u * 4);
      returnStake(p, u);
      drop(p, u * 4);
    } else if (t === 2 || t === 3 || t === 11 || t === 12) {
      profit(p, u * hopOdds(t));
      returnStake(p, u);
      drop(p, u * 4);
    } else drop(p, bets.world);
    bets.world = 0;
  }
  const hornHigh: { key: "hornHigh2" | "hornHigh3" | "hornHigh11" | "hornHigh12"; high: Total }[] = [
    { key: "hornHigh2", high: 2 },
    { key: "hornHigh3", high: 3 },
    { key: "hornHigh11", high: 11 },
    { key: "hornHigh12", high: 12 },
  ];
  for (const { key, high } of hornHigh) {
    const amt = bets[key];
    if (!amt) continue;
    const u = amt / 5;
    if (t === high) {
      profit(p, u * 2 * hopOdds(high));
      returnStake(p, u * 2);
      drop(p, u * 3);
    } else if (t === 2 || t === 3 || t === 11 || t === 12) {
      profit(p, u * hopOdds(t));
      returnStake(p, u);
      drop(p, u * 4);
    } else drop(p, amt);
    bets[key] = 0;
  }
  if (bets.field) {
    const fp = fieldPays(t, bets.field, PRACTICE_TABLE);
    if (fp) {
      profit(p, fp);
      returnStake(p, bets.field);
    } else drop(p, bets.field);
    bets.field = 0;
  }

  function hitCome(n: Box, oddsWorking: boolean) {
    if (!bets.comeOn[n]) return;
    profit(p, bets.comeOn[n]);
    returnStake(p, bets.comeOn[n]);
    if (bets.comeOddsOn[n]) {
      if (oddsWorking) profit(p, passOddsPays(n, bets.comeOddsOn[n]));
      returnStake(p, bets.comeOddsOn[n]);
    }
    bets.comeOn[n] = 0;
    bets.comeOddsOn[n] = 0;
  }
  function loseCome(n: Box, oddsWorking: boolean) {
    drop(p, bets.comeOn[n] || 0);
    if (bets.comeOddsOn[n]) {
      if (oddsWorking) drop(p, bets.comeOddsOn[n]);
      else returnStake(p, bets.comeOddsOn[n]);
    }
    bets.comeOn[n] = 0;
    bets.comeOddsOn[n] = 0;
  }
  function hitDc(n: Box, oddsWorking: boolean) {
    if (!bets.dcOn[n]) return;
    profit(p, bets.dcOn[n]);
    returnStake(p, bets.dcOn[n]);
    if (bets.dcOddsOn[n]) {
      if (oddsWorking) profit(p, dontOddsPays(n, bets.dcOddsOn[n]));
      returnStake(p, bets.dcOddsOn[n]);
    }
    bets.dcOn[n] = 0;
    bets.dcOddsOn[n] = 0;
  }
  function loseDc(n: Box, oddsWorking: boolean) {
    drop(p, bets.dcOn[n] || 0);
    if (bets.dcOddsOn[n]) {
      if (oddsWorking) drop(p, bets.dcOddsOn[n]);
      else returnStake(p, bets.dcOddsOn[n]);
    }
    bets.dcOn[n] = 0;
    bets.dcOddsOn[n] = 0;
  }
  function settleHardAndBig() {
    for (const n of HARD) {
      if (!bets.hard[n]) continue;
      if (t === 7 || (t === n && !hardHit)) {
        drop(p, bets.hard[n]);
        bets.hard[n] = 0;
      } else if (t === n && hardHit) {
        profit(p, bets.hard[n] * (n === 4 || n === 10 ? 7 : 9));
      }
    }
    if (bets.big6) {
      if (t === 6) profit(p, bets.big6);
      else if (t === 7) {
        drop(p, bets.big6);
        bets.big6 = 0;
      }
    }
    if (bets.big8) {
      if (t === 8) profit(p, bets.big8);
      else if (t === 7) {
        drop(p, bets.big8);
        bets.big8 = 0;
      }
    }
  }

  if (!p.puck.on) {
    if (t === 7 || t === 11) {
      if (bets.pass) profit(p, bets.pass);
      if (bets.dont) {
        drop(p, bets.dont);
        bets.dont = 0;
      }
    } else if (t === 2 || t === 3) {
      if (bets.pass) {
        drop(p, bets.pass);
        bets.pass = 0;
      }
      if (bets.dont) profit(p, bets.dont);
    } else if (t === 12) {
      if (bets.pass) {
        drop(p, bets.pass);
        bets.pass = 0;
      }
    } else if (isBox(t)) {
      p.puck = { on: true, point: t };
    }
    /* Come/DC on numbers always work; their odds are OFF on the come-out. Lays work. Place/buy/hard/big are OFF. */
    if (t === 7) {
      for (const n of BOXES) {
        loseCome(n, false);
        hitDc(n, false);
        payLay(p, n);
      }
    } else if (isBox(t)) {
      hitCome(t, false);
      loseDc(t, false);
      loseLay(p, t);
    }
    return p;
  }

  const point = p.puck.point;
  settleHardAndBig();

  if (t === 7) {
    if (bets.come) {
      profit(p, bets.come);
      returnStake(p, bets.come);
      bets.come = 0;
    }
    if (bets.dc) {
      drop(p, bets.dc);
      bets.dc = 0;
    }
    if (bets.pass) {
      drop(p, bets.pass);
      bets.pass = 0;
    }
    if (bets.passOdds) {
      drop(p, bets.passOdds);
      bets.passOdds = 0;
    }
    if (bets.dont) profit(p, bets.dont);
    if (bets.dontOdds) {
      profit(p, dontOddsPays(point, bets.dontOdds));
      returnStake(p, bets.dontOdds);
      bets.dontOdds = 0;
    }
    for (const n of BOXES) {
      loseCome(n, true);
      hitDc(n, true);
      if (bets.place[n]) {
        drop(p, bets.place[n]);
        bets.place[n] = 0;
      }
      if (bets.buy[n]) {
        drop(p, bets.buy[n]);
        bets.buy[n] = 0;
      }
      payLay(p, n);
    }
    p.puck = { on: false };
    p.shooter += 1;
  } else if (t === point) {
    if (bets.pass) profit(p, bets.pass);
    if (bets.passOdds) {
      profit(p, passOddsPays(point, bets.passOdds));
      returnStake(p, bets.passOdds);
      bets.passOdds = 0;
    }
    if (bets.dont) {
      drop(p, bets.dont);
      bets.dont = 0;
    }
    if (bets.dontOdds) {
      drop(p, bets.dontOdds);
      bets.dontOdds = 0;
    }
    if (bets.place[t]) profit(p, placePays(t, bets.place[t]));
    if (bets.buy[t]) profit(p, buyPays(t, bets.buy[t]));
    loseLay(p, t);
    hitCome(t, true);
    loseDc(t, true);
    if (bets.come) {
      bets.comeOn[t] = (bets.comeOn[t] || 0) + bets.come;
      bets.come = 0;
    }
    if (bets.dc) {
      bets.dcOn[t] = (bets.dcOn[t] || 0) + bets.dc;
      bets.dc = 0;
    }
    p.puck = { on: false };
  } else {
    if (isBox(t) && bets.place[t]) profit(p, placePays(t, bets.place[t]));
    if (isBox(t) && bets.buy[t]) profit(p, buyPays(t, bets.buy[t]));
    if (isBox(t)) loseLay(p, t);
    if (isBox(t)) {
      hitCome(t, true);
      loseDc(t, true);
    }
    if (bets.come) {
      if (t === 11) profit(p, bets.come);
      else if (t === 2 || t === 3 || t === 12) {
        drop(p, bets.come);
        bets.come = 0;
      } else if (isBox(t)) {
        bets.comeOn[t] = (bets.comeOn[t] || 0) + bets.come;
        bets.come = 0;
      }
    }
    if (bets.dc) {
      if (t === 11) {
        drop(p, bets.dc);
        bets.dc = 0;
      } else if (t === 2 || t === 3) profit(p, bets.dc);
      else if (t === 12) {
        /* bar — push */
      } else if (isBox(t)) {
        bets.dcOn[t] = (bets.dcOn[t] || 0) + bets.dc;
        bets.dc = 0;
      }
    }
  }
  return p;
}

function load(): PracticeState {
  if (typeof window === "undefined") return defaultPractice();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPractice();
    const p = JSON.parse(raw) as PracticeState;
    if (typeof p.bank !== "number") return defaultPractice();
    const empty = emptyPracticeBets();
    return {
      ...defaultPractice(),
      ...p,
      log: Array.isArray(p.log) ? p.log : [],
      bets: {
        ...empty,
        ...(p.bets || {}),
        place: { ...empty.place, ...(p.bets?.place || {}) },
        buy: { ...empty.buy, ...(p.bets?.buy || {}) },
        lay: { ...empty.lay, ...(p.bets?.lay || {}) },
        layOdds: { ...empty.layOdds, ...(p.bets?.layOdds || {}) },
        comeOn: { ...empty.comeOn, ...(p.bets?.comeOn || {}) },
        comeOddsOn: { ...empty.comeOddsOn, ...(p.bets?.comeOddsOn || {}) },
        dcOn: { ...empty.dcOn, ...(p.bets?.dcOn || {}) },
        dcOddsOn: { ...empty.dcOddsOn, ...(p.bets?.dcOddsOn || {}) },
        hard: { ...empty.hard, ...(p.bets?.hard || {}) },
      },
    };
  } catch {
    return defaultPractice();
  }
}

function save(p: PracticeState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage blocked */
  }
}

const SERVER_SNAP = defaultPractice();
let snapshot: PracticeState = SERVER_SNAP;
let hydrated = false;
const listeners = new Set<() => void>();

function getSnapshot(): PracticeState {
  return snapshot;
}

function getServerSnapshot(): PracticeState {
  return SERVER_SNAP;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!hydrated) {
    hydrated = true;
    snapshot = load();
    queueMicrotask(() => listeners.forEach((l) => l()));
  }
  return () => listeners.delete(cb);
}

function commit(next: PracticeState) {
  snapshot = next;
  save(next);
  listeners.forEach((l) => l());
}

function patch(fn: (cur: PracticeState) => PracticeState) {
  const cur = getSnapshot();
  const next = fn(cur);
  if (next === cur) return;
  commit(next);
}

export function pausePractice() {
  patch((cur) => (cur.paused ? cur : { ...cur, paused: true, msg: "Paused." }));
}

type UndoSnap = { bank: number; bets: PracticeBets };
let undoStack: UndoSnap[] = [];

function pushUndo(cur: PracticeState) {
  undoStack = [...undoStack, { bank: cur.bank, bets: cloneBets(cur.bets) }].slice(-20);
}

function returnOrphanOdds(next: PracticeState) {
  const b = next.bets;
  for (const n of BOXES) {
    if (!b.comeOn[n] && b.comeOddsOn[n]) {
      next.bank += b.comeOddsOn[n];
      b.comeOddsOn[n] = 0;
    }
    if (!b.dcOn[n] && b.dcOddsOn[n]) {
      next.bank += b.dcOddsOn[n];
      b.dcOddsOn[n] = 0;
    }
    if (!b.lay[n] && b.layOdds[n]) {
      next.bank += b.layOdds[n];
      b.layOdds[n] = 0;
    }
  }
  if (!b.pass && b.passOdds) {
    next.bank += b.passOdds;
    b.passOdds = 0;
  }
  if (!b.dont && b.dontOdds) {
    next.bank += b.dontOdds;
    b.dontOdds = 0;
  }
}

const LINE_SPOTS: PracticeSpot[] = ["pass", "come", "dont", "dc", "field"];

function boxFromSpot(spot: string, prefix: string): Box {
  return Number(spot.replace(prefix, "")) as Box;
}

function placeChip(next: PracticeState, spot: PracticeSpot, chip: number, exact = false): string | null {
  if (spot.startsWith("layOdds") && !next.bets.lay[boxFromSpot(spot, "layOdds")]) {
    return "Lay odds only with a lay bet on that number.";
  }
  if (spot === "passOdds" && (!next.puck.on || !next.bets.pass)) {
    return "Pass odds only with a pass bet and a point on.";
  }
  if (spot === "dontOdds" && (!next.puck.on || !next.bets.dont)) {
    return "Don't odds only with a don't pass bet and a point on.";
  }
  if (spot.startsWith("comeOdds") && !next.bets.comeOn[boxFromSpot(spot, "comeOdds")]) {
    return "Come odds after the come bet moves here — tap C ODDS.";
  }
  if (spot.startsWith("dcOdds") && !next.bets.dcOn[boxFromSpot(spot, "dcOdds")]) {
    return "Don't come odds after the DC bet moves here — tap DC ODDS.";
  }
  if (spot === "dont" && next.puck.on) {
    return "Don't Pass only on the come-out. Puck is on.";
  }
  if ((spot === "buy6" || spot === "buy8") && !next.take) {
    return "No buy on 6 or 8 — place them (7:6 is better).";
  }
  if ((spot === "come" || spot === "dc") && !next.puck.on) {
    return "Come / Don't Come after a point is on.";
  }
  if (spot.startsWith("comeOn") && !next.bets.comeOn[boxFromSpot(spot, "comeOn")]) {
    return "Come bets move here from the COME box. Then tap C ODDS.";
  }
  if (spot.startsWith("dcOn") && !next.bets.dcOn[boxFromSpot(spot, "dcOn")]) {
    return "Don't come bets move here from the Don't Come bar. Then tap DC ODDS.";
  }

  const have = spotAmount(next.bets, spot);
  const min = next.tableMin || 5;
  let amt = chip;

  if (!exact) {
    if (spot.startsWith("place")) {
      const box = boxFromSpot(spot, "place");
      amt = placeIncrement(box, chip);
      if (!have) amt = Math.max(amt, placeIncrement(box, min));
    } else if (spot.startsWith("buy")) {
      if (!have) amt = Math.max(chip, min, 20);
    } else if (spot.startsWith("layOdds") || (spot.startsWith("lay") && !spot.startsWith("layOdds"))) {
      const box = boxFromSpot(spot, spot.startsWith("layOdds") ? "layOdds" : "lay");
      amt = layIncrement(box, chip);
      if (!have) amt = Math.max(amt, layMinBet(box, min));
    } else if (spot === "dontOdds" && next.puck.on) {
      amt = layIncrement(next.puck.point, chip);
      if (!have) amt = Math.max(amt, layMinBet(next.puck.point, min));
    } else if (spot.startsWith("dcOdds")) {
      const box = boxFromSpot(spot, "dcOdds");
      amt = layIncrement(box, chip);
      if (!have) amt = Math.max(amt, layMinBet(box, min));
    } else if (LINE_SPOTS.includes(spot) && !have) {
      amt = Math.max(chip, min);
    } else if ((spot === "passOdds" || spot.startsWith("comeOdds")) && !have) {
      amt = Math.max(chip, min);
    }
  }

  if (spot === "passOdds" && next.puck.on) {
    const cap = maxOdds(next.puck.point, next.bets.pass, false);
    const room = cap - have;
    if (room <= 0) return "Max 3-4-5x pass odds.";
    amt = Math.min(amt, room);
  }
  if (spot.startsWith("comeOdds")) {
    const box = boxFromSpot(spot, "comeOdds");
    const cap = maxOdds(box, next.bets.comeOn[box] || 0, false);
    const room = cap - have;
    if (room <= 0) return "Max 3-4-5x come odds on that number.";
    amt = Math.min(amt, room);
  }
  if (spot === "dontOdds" && next.puck.on) {
    const cap = maxOdds(next.puck.point, next.bets.dont, true);
    const room = cap - have;
    if (room <= 0) return "Max 3-4-5x don't odds.";
    amt = Math.min(amt, room);
  }
  if (spot.startsWith("dcOdds")) {
    const box = boxFromSpot(spot, "dcOdds");
    const cap = maxOdds(box, next.bets.dcOn[box] || 0, true);
    const room = cap - have;
    if (room <= 0) return "Max 3-4-5x don't come odds on that number.";
    amt = Math.min(amt, room);
  }
  if (spot.startsWith("layOdds")) {
    const box = boxFromSpot(spot, "layOdds");
    const cap = maxOdds(box, next.bets.lay[box] || 0, true);
    const room = cap - have;
    if (room <= 0) return "Max 3-4-5x lay odds on that number.";
    amt = Math.min(amt, room);
  }

  if (next.bank < amt) return "Not enough bank.";
  next.bank -= amt;
  addToSpot(next.bets, spot, amt);
  return null;
}

export function usePractice() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const tapSpot = useCallback((spot: PracticeSpot) => {
    patch((cur) => {
      if (cur.paused) return { ...cur, msg: "Paused — resume or end game." };
      const next = { ...cur, bets: cloneBets(cur.bets), msg: "" };
      const chip = Math.max(next.chip, 1);
      if (next.take) {
        const have = spotAmount(next.bets, spot);
        const n = Math.min(chip, have);
        if (!n) return cur;
        pushUndo(cur);
        addToSpot(next.bets, spot, -n);
        next.bank += n;
        returnOrphanOdds(next);
        next.msg = `Took down $${Math.round(n)}`;
        return next;
      }
      const err = placeChip(next, spot, chip);
      if (err) {
        next.msg = err;
        return next;
      }
      pushUndo(cur);
      return next;
    });
  }, []);

  const moveBet = useCallback((from: PracticeSpot, to: PracticeSpot) => {
    patch((cur) => {
      if (cur.paused || from === to) return cur;
      const amt = spotAmount(cur.bets, from);
      if (!amt) return cur;
      pushUndo(cur);
      const next = { ...cur, bets: cloneBets(cur.bets), msg: "" };
      addToSpot(next.bets, from, -amt);
      next.bank += amt;
      const err = placeChip(next, to, amt, true);
      if (err) {
        addToSpot(next.bets, from, amt);
        next.bank -= amt;
        next.msg = err;
        return next;
      }
      returnOrphanOdds(next);
      next.msg = `Moved $${Math.round(amt)}`;
      return next;
    });
  }, []);

  const repeatBets = useCallback(() => {
    patch((cur) => {
      if (cur.paused) return cur;
      if (!cur.lastRepeat) return { ...cur, msg: "No previous bets to repeat." };
      const wealth = cur.bank + betsOnTable(cur.bets);
      const cost = betsOnTable(cur.lastRepeat);
      if (wealth < cost) return { ...cur, msg: `Need $${Math.round(cost)} to repeat.` };
      pushUndo(cur);
      return {
        ...cur,
        bets: cloneBets(cur.lastRepeat),
        bank: wealth - cost,
        take: false,
        msg: "Repeated last bets.",
      };
    });
  }, []);

  const clearSpot = useCallback((spot: PracticeSpot) => {
    patch((cur) => {
      if (cur.paused) return cur;
      const have = spotAmount(cur.bets, spot);
      if (!have) return cur;
      pushUndo(cur);
      const next = { ...cur, bets: cloneBets(cur.bets), msg: "" };
      addToSpot(next.bets, spot, -have);
      next.bank += have;
      returnOrphanOdds(next);
      next.msg = `Removed $${Math.round(have)}`;
      return next;
    });
  }, []);

  const setChip = useCallback((chip: number) => {
    patch((cur) => ({ ...cur, chip, take: false, msg: "" }));
  }, []);

  const toggleTake = useCallback(() => {
    patch((cur) => ({ ...cur, take: !cur.take, msg: "" }));
  }, []);

  const rollOnce = useCallback(() => {
    const pair = truePair();
    patch((cur) => {
      if (cur.paused) return cur;
      undoStack = [];
      const lastRepeat = cloneBets(cur.bets);
      const settled = settlePractice(cur, pair.a, pair.b, pair.total);
      settled.lastRepeat = lastRepeat;
      settled.shooterPnl = (cur.shooterPnl || 0) + settled.lastDelta;
      if (settled.shooter !== cur.shooter) {
        settled.lastShooterPnl = settled.shooterPnl;
        settled.shooterPnl = 0;
      }
      const roll: Roll = {
        a: pair.a,
        b: pair.b,
        total: pair.total,
        at: Date.now(),
        shooter: cur.shooter,
      };
      settled.rolls = [...cur.rolls, roll].slice(-MAX_ROLLS);
      settled.log = [
        ...(cur.log || []),
        { a: pair.a, b: pair.b, total: pair.total, delta: settled.lastDelta, at: Date.now() },
      ].slice(-MAX_LOG);
      const sign = settled.lastDelta > 0 ? "+" : settled.lastDelta < 0 ? "-" : "";
      settled.msg = `This roll ${sign}$${Math.abs(Math.round(settled.lastDelta))}`;
      const parked = BOXES.filter(
        (n) => (settled.bets.comeOn[n] || 0) > (lastRepeat.comeOn[n] || 0)
      );
      if (parked.length) {
        settled.msg += ` · tap C ODDS on ${parked.join("/")}`;
      }
      return settled;
    });
    return pair;
  }, []);

  const takeAllDown = useCallback(() => {
    patch((cur) => {
      if (cur.paused) return cur;
      const back = betsOnTable(cur.bets);
      if (!back) return { ...cur, msg: "No bets up." };
      pushUndo(cur);
      return {
        ...cur,
        bank: cur.bank + back,
        bets: emptyPracticeBets(),
        msg: `All bets down $${Math.round(back)}`,
      };
    });
  }, []);

  const undoBet = useCallback(() => {
    patch((cur) => {
      if (cur.paused) return cur;
      const prev = undoStack.pop();
      if (!prev) return { ...cur, msg: "Nothing to undo." };
      return { ...cur, bank: prev.bank, bets: cloneBets(prev.bets), take: false, msg: "Undid last bet." };
    });
  }, []);

  const placeSet = useCallback((boxes: Box[], label: string) => {
    patch((cur) => {
      if (cur.paused) return cur;
      const min = cur.tableMin || 5;
      const adds = boxes.map((n) => {
        const inc = placeIncrement(n, cur.chip);
        return cur.bets.place[n] ? inc : Math.max(inc, placeIncrement(n, min));
      });
      const need = adds.reduce((s, n) => s + n, 0);
      if (cur.bank < need) return { ...cur, msg: `Need $${need} for ${label}.` };
      pushUndo(cur);
      const next = { ...cur, bets: cloneBets(cur.bets), take: false, msg: "" };
      boxes.forEach((n, i) => {
        next.bank -= adds[i];
        next.bets.place[n] = (next.bets.place[n] || 0) + adds[i];
      });
      next.msg = `${label} + selected chip (6/8 in $6 units).`;
      return next;
    });
  }, []);

  const pause = useCallback(() => {
    patch((cur) => (cur.paused ? cur : { ...cur, paused: true, msg: "Paused." }));
  }, []);

  const resume = useCallback(() => {
    patch((cur) => ({ ...cur, paused: false, msg: "" }));
  }, []);

  const endGame = useCallback(() => {
    const cur = getSnapshot();
    undoStack = [];
    commit({
      ...defaultPractice(),
      buyIn: cur.buyIn,
      tableMin: cur.tableMin,
      bank: cur.buyIn,
      chip: cur.chip,
      paused: false,
      msg: "New game.",
    });
  }, []);

  const setBankSettings = useCallback((buyIn: number, tableMin: number) => {
    const bank = Math.max(1, Math.round(buyIn));
    const min = [5, 10, 15, 25].includes(tableMin) ? tableMin : 5;
    patch((cur) => ({
      ...cur,
      buyIn: bank,
      tableMin: min,
      bank,
      paused: false,
      msg: `Bank $${bank} · table min $${min}`,
    }));
  }, []);

  const reset = useCallback(() => {
    undoStack = [];
    const cur = getSnapshot();
    commit({
      ...defaultPractice(),
      buyIn: cur.buyIn,
      tableMin: cur.tableMin,
      bank: cur.buyIn,
      chip: cur.chip,
    });
  }, []);

  const fill72 = useCallback(() => {
    patch((cur) => {
      const extra: Roll[] = [];
      let shooter = cur.shooter;
      let puck = cur.puck;
      for (let i = 0; i < 72; i++) {
        const a = trueDie();
        const b = trueDie();
        const total = asTotal(a + b);
        extra.push({ a, b, total, at: Date.now() + i, shooter });
        if (!puck.on) {
          if (total !== 7 && total !== 11 && total !== 2 && total !== 3 && total !== 12 && isBox(total)) {
            puck = { on: true, point: total };
          }
        } else if (total === 7) {
          puck = { on: false };
          shooter += 1;
        } else if (total === puck.point) {
          puck = { on: false };
        }
      }
      return { ...cur, rolls: extra.slice(-MAX_ROLLS), msg: "72 computer rolls — no bets." };
    });
  }, []);

  return {
    state,
    ready: true,
    tapSpot,
    moveBet,
    repeatBets,
    clearSpot,
    setChip,
    toggleTake,
    rollOnce,
    takeAllDown,
    undoBet,
    placeAcross: () => placeSet(ACROSS, "Across"),
    placeInside: () => placeSet(INSIDE, "Inside"),
    placeOutside: () => placeSet(OUTSIDE, "Outside"),
    pause,
    resume,
    endGame,
    setBankSettings,
    reset,
    fill72,
  };
}
