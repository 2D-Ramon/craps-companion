import type { Box, Puck, Total } from "./types";

const BOXES: Box[] = [4, 5, 6, 8, 9, 10];

export function isBox(n: number): n is Box {
  return BOXES.includes(n as Box);
}

export type RollCall = {
  puck: Puck;
  sevenOut: boolean;
  pointMade: boolean;
  natural: boolean;
  craps: boolean;
};

export function applyRoll(puck: Puck, total: Total): RollCall {
  if (!puck.on) {
    if (total === 7 || total === 11) {
      return { puck, sevenOut: false, pointMade: false, natural: true, craps: false };
    }
    if (total === 2 || total === 3 || total === 12) {
      return { puck, sevenOut: false, pointMade: false, natural: false, craps: true };
    }
    return {
      puck: { on: true, point: total as Box },
      sevenOut: false,
      pointMade: false,
      natural: false,
      craps: false,
    };
  }
  if (total === 7) {
    return {
      puck: { on: false },
      sevenOut: true,
      pointMade: false,
      natural: false,
      craps: false,
    };
  }
  if (total === puck.point) {
    return {
      puck: { on: false },
      sevenOut: false,
      pointMade: true,
      natural: false,
      craps: false,
    };
  }
  return { puck, sevenOut: false, pointMade: false, natural: false, craps: false };
}

export function puckLabel(puck: Puck): string {
  return puck.on ? `POINT ${puck.point}` : "COME OUT";
}
