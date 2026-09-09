import type { Box, OpenBets, Puck, Roll, TableRules, Total } from "./types";
import { applyRoll, type RollCall } from "./puck";

export function emptyBets(): OpenBets {
  return { pass: 0, passOdds: 0, dont: 0, dontOdds: 0, place: {}, field: 0 };
}

function oddsMultiple(point: Box, table: TableRules): number {
  if (table.odds === "1x") return 1;
  if (table.odds === "10x") return 10;
  if (table.odds === "100x") return 100;
  if (point === 4 || point === 10) return 3;
  if (point === 5 || point === 9) return 4;
  return 5;
}

export function passOddsPays(point: Box, amount: number): number {
  if (point === 4 || point === 10) return Math.floor(amount * 2);
  if (point === 5 || point === 9) return Math.floor((amount * 3) / 2);
  return Math.floor((amount * 6) / 5);
}

export function dontOddsPays(point: Box, amount: number): number {
  if (point === 4 || point === 10) return Math.floor(amount / 2);
  if (point === 5 || point === 9) return Math.floor((amount * 2) / 3);
  return Math.floor((amount * 5) / 6);
}

/** 5% commission, round up to a whole dollar (casinos do not take quarters). */
export function vigAmount(base: number): number {
  if (base <= 0) return 0;
  return Math.max(1, Math.ceil(base * 0.05 - 1e-9));
}

/** Buy: true odds minus 5% vig of the wager. */
export function buyPays(box: Box, amt: number): number {
  const gross =
    box === 4 || box === 10 ? amt * 2 : box === 5 || box === 9 ? (amt * 3) / 2 : (amt * 6) / 5;
  return Math.max(0, Math.floor(gross) - vigAmount(amt));
}

/** Lay: true odds minus 5% vig of the win (not the wager). */
export function layPays(box: Box, amt: number): number {
  const gross =
    box === 4 || box === 10 ? amt / 2 : box === 5 || box === 9 ? (amt * 2) / 3 : (amt * 5) / 6;
  const win = Math.floor(gross);
  return Math.max(0, win - vigAmount(win));
}

export function placePays(box: Box, amount: number): number {
  if (box === 4 || box === 10) return Math.floor((amount * 9) / 5);
  if (box === 5 || box === 9) return Math.floor((amount * 7) / 5);
  return Math.floor((amount * 7) / 6);
}

/** Profit on a winning field bet. Standard: 1x on 3/4/9/10/11, 2x on 2, 3x on 12. */
export function fieldPays(total: Total, amount: number, table: TableRules): number {
  if (total === 2) return amount * table.fieldTwo;
  if (total === 12) return amount * table.fieldTwelve;
  if (total === 3 || total === 4 || total === 9 || total === 10 || total === 11) return amount;
  return 0;
}

export function settle(
  bets: OpenBets,
  puck: Puck,
  roll: Roll,
  table: TableRules
): { bets: OpenBets; delta: number; call: RollCall } {
  const call = applyRoll(puck, roll.total);
  let delta = 0;
  const next: OpenBets = {
    pass: bets.pass,
    passOdds: bets.passOdds,
    dont: bets.dont,
    dontOdds: bets.dontOdds,
    place: { ...bets.place },
    field: bets.field,
  };

  if (bets.field) {
    const win = fieldPays(roll.total, bets.field, table);
    if (win) delta += win;
    else if (roll.total === 5 || roll.total === 6 || roll.total === 7 || roll.total === 8) {
      delta -= bets.field;
    }
  }

  if (!puck.on) {
    if (call.natural) {
      delta += bets.pass;
      delta -= bets.dont;
    } else if (call.craps) {
      if (roll.total === 12) {
        delta -= bets.pass;
      } else {
        delta -= bets.pass;
        delta += bets.dont;
      }
    } else if (call.puck.on) {
      const point = call.puck.point;
      const mult = oddsMultiple(point, table);
      if (bets.pass && !bets.passOdds) next.passOdds = bets.pass * mult;
      if (bets.dont && !bets.dontOdds) next.dontOdds = bets.dont * mult;
    }
    return { bets: next, delta, call };
  }

  const point = puck.point;
  if (call.pointMade) {
    delta += bets.pass;
    delta += passOddsPays(point, bets.passOdds);
    delta -= bets.dont;
    delta -= bets.dontOdds;
    next.passOdds = 0;
    next.dontOdds = 0;
    const hit = next.place[point];
    if (hit) delta += placePays(point, hit);
  } else if (call.sevenOut) {
    delta -= bets.pass;
    delta -= bets.passOdds;
    delta += bets.dont;
    delta += dontOddsPays(point, bets.dontOdds);
    next.passOdds = 0;
    next.dontOdds = 0;
    for (const k of Object.keys(next.place)) {
      const box = Number(k) as Box;
      delta -= next.place[box] ?? 0;
    }
    next.place = {};
  } else {
    const box = roll.total;
    if (box === 4 || box === 5 || box === 6 || box === 8 || box === 9 || box === 10) {
      const amt = next.place[box];
      if (amt) delta += placePays(box, amt);
    }
  }

  return { bets: next, delta, call };
}
