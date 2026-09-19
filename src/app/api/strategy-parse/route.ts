import { NextResponse } from "next/server";
import {
  mergeParsed,
  normalizeParsed,
  parseInstructions,
} from "@/lib/parseStrategy";
import { rid, startBet } from "@/lib/strategyEngine";
import type { Box, StartBet, StrategyRule } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM = `You convert craps strategy instructions (typed or spoken, maybe several clips) into JSON.
The player is building a real rail strategy with moving parts — not just a flat list of numbers.

Phases:
- comeout: puck off (Pass / Don't Pass usually live here)
- point: after a point is established (place, field, come)

Bets: pass, dont, field, place (4,5,6,8,9,10), come, hard.
workingComeout: true if place bets stay working on come out.
odds: true if they want odds behind pass/don't/come.

Rules (if / when / after):
when.kind: comeout | pointOn | pointSet | pointMade | sevenOut | hit | hitsCount | roll
when.number: box or roll total
when.hits: N for hitsCount
action.kind: press | powerPress | regress | decrease | sameBet | takeDown | putUp | off | working | reset
action.target: pass | dont | field | place | come | hard | this | all
action.number: box if needed

Iron Cross = place 5,6,8 + field on point.
Inside = 5,6,8,9. Across = 4,5,6,8,9,10. Outside = 4,5,9,10.
Never set both pass and dont unless they clearly hedge.

JSON only:
{
  "name": "short name",
  "comeout": [{"kind":"pass","phase":"comeout","workingComeout":false,"odds":true,"units":1}],
  "point": [{"kind":"place","number":6,"phase":"point","workingComeout":false,"odds":false,"units":1}],
  "rules": [{"when":{"kind":"hit","number":6},"action":{"kind":"press","target":"place","number":6},"note":""}]
}`;

function hydrateBets(raw: unknown): StartBet[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b: Record<string, unknown>) =>
    startBet((b.kind as StartBet["kind"]) || "place", (b.phase as StartBet["phase"]) || "point", {
      number: b.number as Box | undefined,
      workingComeout: Boolean(b.workingComeout),
      odds: Boolean(b.odds),
      units: Number(b.units) || 1,
      dollars: b.dollars != null ? Number(b.dollars) : undefined,
    }),
  );
}

function hydrateRules(raw: unknown): StrategyRule[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: Record<string, unknown>) => {
    const when = (r.when ?? {}) as Record<string, unknown>;
    const action = (r.action ?? {}) as Record<string, unknown>;
    return {
      id: rid(),
      when: {
        kind: (when.kind as StrategyRule["when"]["kind"]) || "hit",
        number: when.number != null ? Number(when.number) : undefined,
        numbers: Array.isArray(when.numbers)
          ? when.numbers.map(Number)
          : when.number != null
            ? [Number(when.number)]
            : undefined,
        hits: when.hits != null ? Number(when.hits) : undefined,
      },
      action: {
        kind: (action.kind as StrategyRule["action"]["kind"]) || "press",
        target: (action.target as StrategyRule["action"]["target"]) || "place",
        number: action.number != null ? (Number(action.number) as Box) : undefined,
        units: action.units != null ? Number(action.units) : undefined,
      },
      note: String(r.note ?? ""),
    };
  });
}

export async function POST(req: Request) {
  let text = "";
  let instructions: string[] = [];
  try {
    const body = (await req.json()) as { text?: string; instructions?: string[] };
    instructions = Array.isArray(body.instructions)
      ? body.instructions.map((s) => String(s).trim()).filter(Boolean)
      : [];
    text = String(body.text ?? "").trim();
    if (!instructions.length && text) instructions = [text];
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!instructions.length) {
    return NextResponse.json({ error: "Say or type a strategy first." }, { status: 400 });
  }

  const fallback = parseInstructions(instructions);
  const key = process.env.XAI_API_KEY;
  if (!key) {
    return NextResponse.json({ ...fallback, source: "local" });
  }

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: instructions.map((c, i) => `${i + 1}. ${c}`).join("\n"),
          },
        ],
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ ...fallback, source: "local" });
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as {
      name?: string;
      comeout?: unknown;
      point?: unknown;
      rules?: unknown;
      pass?: boolean;
      dont?: boolean;
      field?: boolean;
      place?: number[];
    };
    const comeout = hydrateBets(parsed.comeout);
    const point = hydrateBets(parsed.point);
    const rules = hydrateRules(parsed.rules);
    const merged = mergeParsed(fallback, {
      ...normalizeParsed({
        name: parsed.name || fallback.name,
        pass: Boolean(parsed.pass),
        dont: Boolean(parsed.dont),
        field: Boolean(parsed.field),
        place: (parsed.place ?? fallback.place) as Box[],
        comeout,
        point,
        rules,
        instructions,
      }),
      comeout: comeout.length ? comeout : fallback.comeout,
      point: point.length ? point : fallback.point,
      rules: rules.length ? rules : fallback.rules,
    });
    return NextResponse.json({ ...merged, source: "ai" });
  } catch {
    return NextResponse.json({ ...fallback, source: "local" });
  }
}
