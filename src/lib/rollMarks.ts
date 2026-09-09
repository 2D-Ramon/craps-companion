import { applyRoll } from "./puck";
import type { Puck, Roll } from "./types";

export type RollMark = {
  roll: Roll;
  mark: string;
  cls: "onset" | "hit" | "out" | "nat" | "craps" | "working" | "";
};

export function decorateRolls(rolls: Roll[], startPuck?: Puck | null): RollMark[] {
  let puck: Puck = startPuck && startPuck.on ? { on: true, point: startPuck.point } : { on: false };
  return rolls.map((r) => {
    const pointBefore = puck.on ? puck.point : 0;
    const call = applyRoll(puck, r.total);
    let mark = "";
    let cls: RollMark["cls"] = "";
    if (call.sevenOut) {
      mark = "7 OUT";
      cls = "out";
    } else if (call.pointMade) {
      mark = "HIT";
      cls = "hit";
    } else if (call.natural) {
      mark = "NAT";
      cls = "nat";
    } else if (call.craps) {
      mark = "CR";
      cls = "craps";
    } else if (call.puck.on && !pointBefore) {
      mark = "ON";
      cls = "onset";
    } else if (pointBefore) {
      mark = "P" + pointBefore;
      cls = "working";
    } else if (r.a && r.b) {
      mark = r.a + "-" + r.b;
    }
    if (r.a && r.b && r.a === r.b && (r.total === 4 || r.total === 6 || r.total === 8 || r.total === 10)) {
      mark = mark ? mark + " H" : "H";
    }
    puck = call.puck;
    return { roll: r, mark, cls };
  });
}
