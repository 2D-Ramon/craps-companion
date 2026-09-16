import { NextResponse } from "next/server";
import { normalizeParsed, parseStrategyText } from "@/lib/parseStrategy";

export const runtime = "nodejs";

const SYSTEM = `You convert a craps betting strategy (typed or spoken English) into JSON.
Only these bets exist in this app: pass (Pass line + auto odds), dont (Don't Pass + auto odds), field, place numbers 4,5,6,8,9,10.
Never set both pass and dont true. Prefer the one they actually said.
Iron Cross = place 5,6,8 and field.
Inside = place 5,6,8,9. Across = 4,5,6,8,9,10. Outside = 4,5,9,10.
Reply JSON only:
{"name":"short name","pass":false,"dont":false,"field":false,"place":[6,8]}`;

export async function POST(req: Request) {
  let text = "";
  try {
    const body = (await req.json()) as { text?: string };
    text = String(body.text ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "Say or type a strategy first." }, { status: 400 });
  }

  const fallback = normalizeParsed(parseStrategyText(text));
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
          { role: "user", content: text },
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
      pass?: boolean;
      dont?: boolean;
      field?: boolean;
      place?: number[];
    };
    return NextResponse.json({
      ...normalizeParsed({
        name: parsed.name || fallback.name,
        pass: Boolean(parsed.pass),
        dont: Boolean(parsed.dont),
        field: Boolean(parsed.field),
        place: (parsed.place ?? fallback.place) as typeof fallback.place,
      }),
      source: "ai",
    });
  } catch {
    return NextResponse.json({ ...fallback, source: "local" });
  }
}
