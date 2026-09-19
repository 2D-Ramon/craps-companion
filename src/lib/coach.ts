import type { Box, CustomStrategy, Session } from "./types";
import { ruleLine } from "./strategyEngine";

const BOXES: Box[] = [4, 5, 6, 8, 9, 10];

/** One glance line: what should be on the table right now. */
export function coachLine(session: Session, custom: CustomStrategy | null): string {
  const b = session.bets;
  const phase = session.puck.on ? `Point ${session.puck.point}` : "Come out";
  const bits: string[] = [];
  if (b.pass) bits.push(`Pass $${Math.round(b.pass)}`);
  if (b.passOdds) bits.push(`odds $${Math.round(b.passOdds)}`);
  if (b.dont) bits.push(`Don't $${Math.round(b.dont)}`);
  if (b.dontOdds) bits.push(`lay odds $${Math.round(b.dontOdds)}`);
  if (b.field) bits.push(`Field $${Math.round(b.field)}`);
  for (const n of BOXES) {
    if (b.place[n]) bits.push(`place ${n} $${Math.round(b.place[n]!)}`);
    if (b.buy?.[n]) bits.push(`buy ${n} $${Math.round(b.buy[n]!)}`);
    if (b.lay?.[n]) bits.push(`lay ${n} $${Math.round(b.lay[n]!)}`);
  }
  const table = bits.length ? bits.join(" · ") : "no chips out (track)";
  const next = custom?.rules?.[0] ? ` Next: ${ruleLine(custom.rules[0])}.` : "";
  return `${phase}: ${table}.${next}`;
}
