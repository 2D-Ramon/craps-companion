import type { Box } from "./types";
import { describeCustom } from "./strategies";

export type ParsedStrategy = {
  name: string;
  pass: boolean;
  dont: boolean;
  field: boolean;
  place: Box[];
};

const BOXES: Box[] = [4, 5, 6, 8, 9, 10];

const WORDS: Record<string, Box> = {
  four: 4,
  five: 5,
  six: 6,
  eight: 8,
  nine: 9,
  ten: 10,
};

function uniqPlace(nums: Box[]): Box[] {
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

/** Turn spoken or typed craps English into bets the player can still edit. */
export function parseStrategyText(raw: string): ParsedStrategy {
  const t = raw
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  let pass = false;
  let dont = false;
  let field = false;
  let place: Box[] = [];

  if (has(t, /\biron\s*cross\b/)) {
    place = [5, 6, 8];
    field = true;
  }
  if (has(t, /\b(inside|insides)\b/)) {
    place = uniqPlace([...place, 5, 6, 8, 9]);
  }
  if (has(t, /\b(across|all across|place across)\b/)) {
    place = uniqPlace([...place, 4, 5, 6, 8, 9, 10]);
  }
  if (has(t, /\boutside\b/)) {
    place = uniqPlace([...place, 4, 5, 9, 10]);
  }

  const mentioned: Box[] = [];
  for (const n of BOXES) {
    if (new RegExp(`(?:^|\\D)${n}(?:\\D|$)`).test(t)) mentioned.push(n);
  }
  for (const [word, n] of Object.entries(WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(t)) mentioned.push(n);
  }
  if (mentioned.length && has(t, /\b(place|put|buy|inside|across|outside|on the|numbers?)\b/)) {
    place = uniqPlace([...place, ...mentioned]);
  } else if (mentioned.length && !has(t, /\b(pass|don't|dont|field|hop)\b/) && mentioned.some((n) => n === 6 || n === 8)) {
    place = uniqPlace([...place, ...mentioned]);
  }

  if (has(t, /\b(6\s*(and|&|\/)\s*8|six\s+and\s+eight|place\s+the\s+inside|the\s+6\s+and\s+8)\b/)) {
    place = uniqPlace([...place, 6, 8]);
  }

  if (has(t, /\bfield\b/)) field = true;

  const dark = has(t, /\b(don't\s+pass|dont\s+pass|don't\s+come|dark\s+side|laying\s+odds|lay\s+odds)\b/);
  const right = has(t, /\b(pass\s+line|pass\s+and\s+odds|pass\s+with\s+odds|3[-\s]?point\s+molly|molly|do\s+pass)\b/);
  if (dark && !right) dont = true;
  else if (right && !dark) pass = true;
  else if (has(t, /\bdon't\b|\bdont\b/) && has(t, /\bpass\b/)) dont = true;
  else if (has(t, /\bpass\b/) && !has(t, /\bdon't\b|\bdont\b/)) pass = true;

  if (pass && dont) {
    dont = dark;
    pass = !dont;
  }

  let name = grabName(t);
  if (!name) {
    if (has(t, /\biron\s*cross\b/)) name = "Iron Cross";
    else if (has(t, /\bmolly\b/)) name = "Molly";
    else if (dont) name = "Don't Pass";
    else if (place.length === 2 && place.includes(6) && place.includes(8) && !field && !pass) {
      name = "Place 6 & 8";
    } else {
      name = describeCustom({
        id: "",
        name: "",
        pass,
        dont,
        field,
        place,
        createdAt: 0,
      }).slice(0, 40) || "Custom";
    }
  }

  return { name, pass, dont, field, place: uniqPlace(place) };
}

export function normalizeParsed(p: ParsedStrategy): ParsedStrategy {
  const place = uniqPlace(p.place.filter((n): n is Box => (BOXES as number[]).includes(Number(n))));
  let pass = Boolean(p.pass);
  let dont = Boolean(p.dont);
  if (pass && dont) {
    dont = true;
    pass = false;
  }
  return {
    name: (p.name || "Custom").trim().slice(0, 48),
    pass,
    dont,
    field: Boolean(p.field),
    place,
  };
}
