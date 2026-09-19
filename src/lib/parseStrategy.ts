import type {
  BetKind,
  BetPhase,
  Box,
  CustomStrategy,
  StartBet,
  StrategyRule,
} from "./types";
import {
  emptyCustom,
  migrateCustom,
  rid,
  startBet,
} from "./strategyEngine";

const BOXES: Box[] = [4, 5, 6, 8, 9, 10];

export type ParsedStrategy = {
  name: string;
  pass: boolean;
  dont: boolean;
  field: boolean;
  place: Box[];
  comeout: StartBet[];
  point: StartBet[];
  rules: StrategyRule[];
  instructions: string[];
};

function uniqBox(nums: Box[]): Box[] {
  return BOXES.filter((n) => nums.includes(n));
}

function grabName(text: string): string {
  const m = text.match(
    /(?:call(?:ed)?|name(?:d)?)\s+(?:it\s+|this\s+)?["']?([a-z0-9][a-z0-9 &+/\-]{1,40})["']?/i,
  );
  return m ? m[1].trim().replace(/\s+/g, " ") : "";
}

function has(t: string, re: RegExp): boolean {
  return re.test(t);
}

function numbersIn(t: string): Box[] {
  const out: Box[] = [];
  for (const n of BOXES) {
    if (new RegExp(`(?:^|\\D)${n}(?:\\D|$)`).test(t)) out.push(n);
  }
  const words: Record<string, Box> = {
    four: 4,
    five: 5,
    six: 6,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  for (const [w, n] of Object.entries(words)) {
    if (new RegExp(`\\b${w}\\b`).test(t)) out.push(n);
  }
  return uniqBox(out);
}

function phaseOf(t: string): BetPhase | null {
  if (has(t, /\b(come\s*out|comeout|before the point|puck off)\b/)) return "comeout";
  if (has(t, /\b(point is on|after the point|point (is )?set|point established|once a point)\b/)) {
    return "point";
  }
  return null;
}

function pushBet(
  list: StartBet[],
  kind: BetKind,
  phase: BetPhase,
  extra: Partial<StartBet> = {},
) {
  const key = `${kind}-${extra.number ?? ""}-${phase}`;
  if (list.some((b) => `${b.kind}-${b.number ?? ""}-${b.phase}` === key)) return;
  list.push(startBet(kind, phase, extra));
}

/** One spoken/typed clip → bets and if/when rules. */
export function parseStrategyText(raw: string): ParsedStrategy {
  const t = raw
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  const comeout: StartBet[] = [];
  const point: StartBet[] = [];
  const rules: StrategyRule[] = [];
  let pass = false;
  let dont = false;
  let field = false;
  let place: Box[] = [];

  const phase = phaseOf(t) ?? "point";
  const workingComeout = has(t, /\bworking\b/) && has(t, /\bcome\s*out\b/);

  if (has(t, /\biron\s*cross\b/)) {
    place = [5, 6, 8];
    field = true;
    for (const n of place) pushBet(point, "place", "point", { number: n });
    pushBet(point, "field", "point");
  }
  if (has(t, /\b(inside|insides)\b/)) place = uniqBox([...place, 5, 6, 8, 9]);
  if (has(t, /\b(across|all across|place across)\b/)) {
    place = uniqBox([...place, 4, 5, 6, 8, 9, 10]);
  }
  if (has(t, /\boutside\b/)) place = uniqBox([...place, 4, 5, 9, 10]);

  const mentioned = numbersIn(t);
  if (mentioned.length && has(t, /\b(place|put|buy|inside|across|outside|on the|numbers?)\b/)) {
    place = uniqBox([...place, ...mentioned]);
  } else if (
    mentioned.length &&
    !has(t, /\b(pass|don't|dont|field|hop|if|when|after)\b/) &&
    mentioned.some((n) => n === 6 || n === 8)
  ) {
    place = uniqBox([...place, ...mentioned]);
  }
  if (has(t, /\b(6\s*(and|&|\/)\s*8|six\s+and\s+eight)\b/)) {
    place = uniqBox([...place, 6, 8]);
  }
  if (has(t, /\bfield\b/)) field = true;

  const dark = has(t, /\b(don't\s+pass|dont\s+pass|dark\s+side)\b/);
  const right = has(t, /\b(pass\s+line|pass\s+and\s+odds|pass\s+with\s+odds|3[-\s]?point\s+molly|molly)\b/);
  if (dark) dont = true;
  else if (right || (has(t, /\bpass\b/) && !has(t, /\bdon't\b|\bdont\b/))) pass = true;

  const dest = phase === "comeout" ? comeout : point;
  if (pass) pushBet(comeout, "pass", "comeout", { odds: true });
  if (dont) pushBet(comeout, "dont", "comeout", { odds: true });
  if (field) pushBet(dest, "field", phase);
  for (const n of place) {
    pushBet(dest, "place", phase, { number: n, workingComeout });
  }
  if (has(t, /\bcome\s+bet\b/) || has(t, /\bcome\s+bets\b/)) {
    pushBet(point, "come", "point", { odds: true });
  }

  const hitN = mentioned[0];
  const wordHits: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };
  let hitCount = 0;
  if (has(t, /\btwice\b/) || has(t, /\btwo times\b/)) hitCount = 2;
  else if (has(t, /\bthree times\b/)) hitCount = 3;
  else {
    const hitsMatch = t.match(/\bafter\s+(\d+|two|three|four|one)\s+hits?\b/);
    if (hitsMatch) hitCount = wordHits[hitsMatch[1]] ?? Number(hitsMatch[1]) ?? 0;
  }

  const isIf = has(t, /\b(if|when|after|once)\b/);
  if (isIf && has(t, /\b(press|power\s*press|increase)\b/)) {
    rules.push({
      id: rid(),
      when: hitCount
        ? { kind: "hitsCount", number: hitN, hits: hitCount }
        : { kind: "hit", number: hitN },
      action: {
        kind: has(t, /\bpower\b/) ? "powerPress" : "press",
        target: "place",
        number: hitN,
      },
      note: raw.trim(),
    });
  }
  if (isIf && has(t, /\b(regress|drop (it |them )?down|back to min)\b/)) {
    rules.push({
      id: rid(),
      when: hitCount
        ? { kind: "hitsCount", number: hitN, hits: hitCount }
        : { kind: "hit", number: hitN },
      action: { kind: "regress", target: "place", number: hitN },
      note: raw.trim(),
    });
  }
  if (isIf && has(t, /\b(decrease|take (it |them )?down one|press down)\b/)) {
    rules.push({
      id: rid(),
      when: { kind: "hit", number: hitN },
      action: { kind: "decrease", target: "place", number: hitN },
      note: raw.trim(),
    });
  }
  if (has(t, /\b(take\s*(it |them |the )?(down|off)|pull\s*down)\b/)) {
    rules.push({
      id: rid(),
      when: hitCount
        ? { kind: "hitsCount", number: hitN, hits: hitCount }
        : has(t, /\bseven\b/)
          ? { kind: "sevenOut" }
          : { kind: "hit", number: hitN },
      action: {
        kind: "takeDown",
        target: has(t, /\bfield\b/) ? "field" : hitN ? "place" : "all",
        number: hitN,
      },
      note: raw.trim(),
    });
  }
  if (has(t, /\bseven[-\s]?out\b/) && has(t, /\breset\b/)) {
    rules.push({
      id: rid(),
      when: { kind: "sevenOut" },
      action: { kind: "reset", target: "all" },
      note: raw.trim(),
    });
  }
  if (has(t, /\bsame\s+bet\b/) || has(t, /\bcollect\b/)) {
    rules.push({
      id: rid(),
      when: { kind: "hit", number: hitN },
      action: { kind: "sameBet", target: "place", number: hitN },
      note: raw.trim(),
    });
  }

  let name = grabName(t);
  if (!name) {
    if (has(t, /\biron\s*cross\b/)) name = "Iron Cross";
    else if (dont) name = "Don't Pass";
    else if (place.length === 2 && place.includes(6) && place.includes(8)) name = "Place 6 & 8";
    else name = "";
  }

  return {
    name,
    pass,
    dont,
    field,
    place,
    comeout,
    point,
    rules,
    instructions: raw.trim() ? [raw.trim()] : [],
  };
}

export function normalizeParsed(p: ParsedStrategy): ParsedStrategy {
  const place = uniqBox((p.place ?? []).filter((n): n is Box => BOXES.includes(Number(n) as Box)));
  let pass = Boolean(p.pass);
  let dont = Boolean(p.dont);
  if (pass && dont) {
    dont = true;
    pass = false;
  }
  return {
    name: (p.name || "").trim().slice(0, 48),
    pass,
    dont,
    field: Boolean(p.field),
    place,
    comeout: p.comeout ?? [],
    point: p.point ?? [],
    rules: p.rules ?? [],
    instructions: p.instructions ?? [],
  };
}

export function mergeParsed(into: ParsedStrategy, add: ParsedStrategy): ParsedStrategy {
  const comeout = [...into.comeout];
  const point = [...into.point];
  for (const b of add.comeout) {
    if (!comeout.some((x) => x.kind === b.kind && x.number === b.number)) comeout.push(b);
  }
  for (const b of add.point) {
    if (!point.some((x) => x.kind === b.kind && x.number === b.number)) point.push(b);
  }
  return {
    name: add.name || into.name,
    pass: into.pass || add.pass,
    dont: into.dont || add.dont,
    field: into.field || add.field,
    place: uniqBox([...into.place, ...add.place]),
    comeout,
    point,
    rules: [...into.rules, ...add.rules],
    instructions: [...into.instructions, ...add.instructions.filter(Boolean)],
  };
}

export function parsedToDraft(p: ParsedStrategy, name: string): Omit<CustomStrategy, "id" | "createdAt"> {
  const n = name.trim() || p.name || "Custom";
  return {
    name: n,
    instructions: p.instructions,
    comeout: p.comeout,
    point: p.point,
    rules: p.rules,
    pass: p.pass,
    dont: p.dont,
    field: p.field,
    place: p.place,
  };
}

export function draftFromCustom(c: CustomStrategy): ParsedStrategy {
  const m = migrateCustom(c);
  return {
    name: m.name,
    pass: Boolean(m.pass),
    dont: Boolean(m.dont),
    field: Boolean(m.field),
    place: m.place ?? [],
    comeout: m.comeout,
    point: m.point,
    rules: m.rules,
    instructions: m.instructions,
  };
}

export function parseInstructions(clips: string[]): ParsedStrategy {
  let acc: ParsedStrategy = {
    name: "",
    pass: false,
    dont: false,
    field: false,
    place: [],
    comeout: [],
    point: [],
    rules: [],
    instructions: [],
  };
  for (const clip of clips) {
    if (!clip.trim()) continue;
    acc = mergeParsed(acc, parseStrategyText(clip));
  }
  if (!acc.name) acc.name = "Custom";
  return acc;
}

export function emptyParsed(): ParsedStrategy {
  const e = emptyCustom();
  return {
    name: "",
    pass: false,
    dont: false,
    field: false,
    place: [],
    comeout: e.comeout,
    point: e.point,
    rules: e.rules,
    instructions: [],
  };
}
