"use client";

import { useRef, useState, type ReactNode } from "react";
import { parseInstructions } from "@/lib/parseStrategy";
import {
  ACTION_OPTIONS,
  WHEN_OPTIONS,
  kindLabel,
  phaseLabel,
  rid,
  ruleLine,
  startBet,
} from "@/lib/strategyEngine";
import { customIsValid } from "@/lib/strategies";
import { useStore } from "@/lib/store";
import type {
  ActionKind,
  BetKind,
  BetPhase,
  Box,
  CustomStrategy,
  StartBet,
  StrategyAction,
  StrategyId,
  StrategyRule,
  StrategyWhen,
  WhenKind,
} from "@/lib/types";

const PLACE: Box[] = [4, 5, 6, 8, 9, 10];
const BUY: Box[] = [4, 5, 9, 10];
const ROLLS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const KINDS: BetKind[] = ["pass", "dont", "field", "come"];

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (ev: {
    resultIndex: number;
    results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
  }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

export function StrategyBuilder({
  tableMin,
  onCancel,
  onSaved,
}: {
  tableMin: number;
  onCancel: () => void;
  onSaved: (id: StrategyId) => void;
}) {
  const { saveCustom } = useStore();
  const [step, setStep] = useState<"collect" | "preview">("collect");
  const [name, setName] = useState("");
  const [clips, setClips] = useState<string[]>([]);
  const [clip, setClip] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [building, setBuilding] = useState(false);
  const [err, setErr] = useState("");
  const [comeout, setComeout] = useState<StartBet[]>([]);
  const [point, setPoint] = useState<StartBet[]>([]);
  const [rules, setRules] = useState<StrategyRule[]>([]);
  const wantListen = useRef(false);
  const recRef = useRef<SpeechRec | null>(null);
  const committedRef = useRef("");
  const interimRef = useRef("");
  const seenFinals = useRef(0);

  function joinSpeech(prev: string, next: string): string {
    const n = next.trim();
    const p = prev.trim();
    if (!n) return p;
    if (!p) return n;
    if (p.endsWith(n)) return p;
    if (n.startsWith(p)) return n;
    const last = p.split(" ").slice(-8).join(" ");
    if (n.startsWith(last) && last.length > 0) {
      return `${p.slice(0, p.length - last.length)}${n}`.replace(/\s+/g, " ").trim();
    }
    return `${p} ${n}`.replace(/\s+/g, " ").trim();
  }

  function stopListen() {
    wantListen.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recRef.current = null;
    const leftover = interimRef.current.trim();
    if (leftover) {
      committedRef.current = joinSpeech(committedRef.current, leftover);
      setClip(committedRef.current);
    }
    interimRef.current = "";
    setInterim("");
    setListening(false);
  }

  function startListen() {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setErr("This browser can't listen. Type the instruction instead.");
      return;
    }
    if (listening) return;
    committedRef.current = clip;
    seenFinals.current = 0;
    wantListen.current = true;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (ev) => {
      const results = ev.results;
      if (results.length < seenFinals.current) seenFinals.current = 0;
      let mid = "";
      for (let i = seenFinals.current; i < results.length; i++) {
        const row = results[i];
        const said = row[0]?.transcript ?? "";
        if (row.isFinal) {
          committedRef.current = joinSpeech(committedRef.current, said);
          seenFinals.current = i + 1;
          setClip(committedRef.current);
        } else {
          mid += said;
        }
      }
      interimRef.current = mid;
      setInterim(mid);
    };
    rec.onerror = () => {
      /* keep listening until Stop; onend will restart */
    };
    rec.onend = () => {
      if (!wantListen.current) {
        recRef.current = null;
        setListening(false);
        return;
      }
      seenFinals.current = 0;
      try {
        rec.start();
      } catch {
        setListening(false);
      }
    };
    recRef.current = rec;
    setListening(true);
    setErr("");
    rec.start();
  }

  function addInstruction() {
    const text = `${clip} ${interim}`.replace(/\s+/g, " ").trim();
    if (!text) {
      setErr("Speak or type this instruction first.");
      return;
    }
    stopListen();
    setClips((c) => [...c, text]);
    committedRef.current = "";
    setClip("");
    setInterim("");
    setErr("");
  }

  async function startStrategy() {
    const pending = `${clip} ${interim}`.replace(/\s+/g, " ").trim();
    const all = pending ? [...clips, pending] : clips;
    if (!all.length) {
      setErr("Add at least one instruction, or pick bets below after starting.");
      return;
    }
    stopListen();
    if (pending) {
      setClips(all);
      setClip("");
    }
    setBuilding(true);
    setErr("");
    try {
      const res = await fetch("/api/strategy-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: all, text: all.join(". ") }),
      });
      const data = (await res.json()) as {
        name?: string;
        comeout?: StartBet[];
        point?: StartBet[];
        rules?: StrategyRule[];
        pass?: boolean;
        dont?: boolean;
        field?: boolean;
        place?: Box[];
        error?: string;
      };
      const local = parseInstructions(all);
      setName((n) => n || data.name || local.name || "Custom");
      setComeout(data.comeout?.length ? data.comeout : local.comeout);
      setPoint(data.point?.length ? data.point : local.point);
      setRules(data.rules?.length ? data.rules : local.rules);
      if (!data.comeout?.length && !local.comeout.length && local.pass) {
        setComeout([startBet("pass", "comeout", { odds: true })]);
      }
      setStep("preview");
    } catch {
      const local = parseInstructions(all);
      setName((n) => n || local.name || "Custom");
      setComeout(local.comeout);
      setPoint(local.point);
      setRules(local.rules);
      setStep("preview");
    } finally {
      setBuilding(false);
    }
  }

  function confirm() {
    const draft: Omit<CustomStrategy, "id" | "createdAt"> = {
      name,
      instructions: clips,
      comeout,
      point,
      rules,
      pass: comeout.some((b) => b.kind === "pass"),
      dont: comeout.some((b) => b.kind === "dont"),
      field: [...comeout, ...point].some((b) => b.kind === "field"),
      place: [...comeout, ...point]
        .filter((b) => b.kind === "place" && b.number)
        .map((b) => b.number as Box),
    };
    const problem = customIsValid(draft);
    if (problem) {
      setErr(problem);
      return;
    }
    const id = saveCustom(draft);
    onSaved(id);
  }

  if (step === "preview") {
    return (
      <Preview
        name={name}
        setName={setName}
        tableMin={tableMin}
        comeout={comeout}
        setComeout={setComeout}
        point={point}
        setPoint={setPoint}
        rules={rules}
        setRules={setRules}
        clips={clips}
        err={err}
        onBack={() => setStep("collect")}
        onConfirm={confirm}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-gold/40 bg-black/35 p-3 space-y-3">
      <p className="font-semibold text-gold">Create a strategy</p>
      <p className="text-xs text-muted">
        Speak one piece at a time. Listening stays on until you press Stop. Then add another
        instruction, or start the strategy to preview and edit.
      </p>
      <label className="block text-sm">
        Name (optional until preview)
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Inside press"
          className="mt-1 w-full h-11 rounded-lg bg-black/30 border border-gold/25 px-3 text-base"
        />
      </label>

      {clips.length > 0 && (
        <ol className="space-y-1.5">
          {clips.map((c, i) => (
            <li
              key={`${i}-${c.slice(0, 12)}`}
              className="flex gap-2 items-start rounded-lg bg-black/30 border border-gold/15 px-2 py-2 text-sm"
            >
              <span className="text-gold text-xs mt-0.5">{i + 1}.</span>
              <span className="flex-1">{c}</span>
              <button
                type="button"
                className="text-xs text-danger"
                onClick={() => setClips((xs) => xs.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
      )}

      <label className="block text-sm">
        {clips.length ? "Next instruction" : "Instruction"}
        <textarea
          value={listening && interim ? `${clip} ${interim}`.trim() : clip}
          readOnly={listening}
          onChange={(e) => {
            if (listening) return;
            committedRef.current = e.target.value;
            setClip(e.target.value);
            setInterim("");
          }}
          rows={3}
          placeholder='e.g. "On come out, pass line" then add "When the point is on, place 6 and 8. If 6 hits twice, press."'
          className="mt-1 w-full rounded-lg bg-black/30 border border-gold/25 px-3 py-2 text-base"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => (listening ? stopListen() : startListen())}
          className={`h-12 rounded-lg border text-sm font-semibold ${
            listening ? "border-gold bg-gold text-felt-deep" : "border-gold/40 text-gold"
          }`}
        >
          {listening ? "Stop" : "Speak"}
        </button>
        <button
          type="button"
          onClick={addInstruction}
          className="h-12 rounded-lg border border-gold/40 text-gold text-sm font-semibold"
        >
          Add another instruction
        </button>
      </div>
      {listening && <p className="text-xs text-gold">Listening… press Stop when that part is done.</p>}
      {err && <p className="text-sm text-danger">{err}</p>}
      <button
        type="button"
        onClick={() => void startStrategy()}
        disabled={building}
        className="w-full h-12 rounded-xl bg-gold text-felt-deep font-semibold disabled:opacity-60"
      >
        {building ? "Building…" : "Start strategy"}
      </button>
      <button type="button" onClick={onCancel} className="w-full h-11 rounded-lg bg-black/30 text-sm">
        Cancel
      </button>
    </div>
  );
}

function Preview({
  name,
  setName,
  tableMin,
  comeout,
  setComeout,
  point,
  setPoint,
  rules,
  setRules,
  clips,
  err,
  onBack,
  onConfirm,
  onCancel,
}: {
  name: string;
  setName: (v: string) => void;
  tableMin: number;
  comeout: StartBet[];
  setComeout: (v: StartBet[]) => void;
  point: StartBet[];
  setPoint: (v: StartBet[]) => void;
  rules: StrategyRule[];
  setRules: (v: StrategyRule[]) => void;
  clips: string[];
  err: string;
  onBack: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-gold/40 bg-black/35 p-3 space-y-4">
      <p className="font-semibold text-gold">Preview — confirm or edit</p>
      <p className="text-xs text-muted">
        Come-out bets vs point-on bets, then if / when / press / regress. Fix anything the mic or
        text got wrong.
      </p>
      {clips.length > 0 && (
        <div className="text-xs text-muted space-y-1">
          {clips.map((c, i) => (
            <p key={i}>
              <span className="text-gold">{i + 1}.</span> {c}
            </p>
          ))}
        </div>
      )}
      <label className="block text-sm">
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full h-11 rounded-lg bg-black/30 border border-gold/25 px-3 text-base"
        />
      </label>

      <BetSection
        title="Starting bets — come out (puck off)"
        hint="Pass / Don't usually live here. Set a dollar amount on each bet. Buy/lay/place can work on come out if you check that box."
        list={comeout}
        setList={setComeout}
        defaultPhase="comeout"
        tableMin={tableMin}
      />
      <BetSection
        title="Starting bets — point is on"
        hint="Place, buy 4/5/9/10, lay, field, come after a point is established."
        list={point}
        setList={setPoint}
        defaultPhase="point"
        tableMin={tableMin}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">If / when rules</p>
          <button
            type="button"
            className="text-xs text-gold"
            onClick={() =>
              setRules([
                ...rules,
                {
                  id: rid(),
                  when: { kind: "hit", numbers: [6, 8] },
                  action: { kind: "press", target: "place", number: 6 },
                  note: "",
                },
              ])
            }
          >
            Add rule
          </button>
        </div>
        <p className="text-xs text-muted mb-2">
          Pick one or more rolls 2–12. “After this many hits” means after that count of hits on the
          numbers you selected (example: after 2 hits on 6 and 8).
        </p>
        <div className="space-y-2">
          {rules.length === 0 && (
            <p className="text-xs text-muted">No moving parts yet — flat bets until you add a rule.</p>
          )}
          {rules.map((r) => (
            <RuleRow
              key={r.id}
              rule={r}
              onChange={(n) => setRules(rules.map((x) => (x.id === r.id ? n : x)))}
              onRemove={() => setRules(rules.filter((x) => x.id !== r.id))}
            />
          ))}
        </div>
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}
      <button
        type="button"
        onClick={onConfirm}
        className="w-full h-12 rounded-xl bg-gold text-felt-deep font-semibold"
      >
        Confirm & use
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onBack} className="h-11 rounded-lg bg-black/30 text-sm">
          Back to instructions
        </button>
        <button type="button" onClick={onCancel} className="h-11 rounded-lg bg-black/30 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

function BetSection({
  title,
  hint,
  list,
  setList,
  defaultPhase,
  tableMin,
}: {
  title: string;
  hint: string;
  list: StartBet[];
  setList: (v: StartBet[]) => void;
  defaultPhase: BetPhase;
  tableMin: number;
}) {
  function add(kind: BetKind, number?: Box) {
    setList([
      ...list,
      startBet(kind, defaultPhase, {
        number,
        dollars: tableMin,
        workingComeout:
          defaultPhase === "comeout" && (kind === "place" || kind === "buy" || kind === "lay"),
      }),
    ]);
  }
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted mb-2">{hint}</p>
      <div className="space-y-2 mb-2">
        <ChipRow label="Line">
          {KINDS.map((k) => (
            <Chip key={k} onClick={() => add(k)}>
              {kindLabel(k)}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow label="Place">
          {PLACE.map((n) => (
            <Chip key={`p${n}`} onClick={() => add("place", n)}>
              {n}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow label="Buy">
          {BUY.map((n) => (
            <Chip key={`b${n}`} onClick={() => add("buy", n)}>
              {n}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow label="Lay">
          {PLACE.map((n) => (
            <Chip key={`l${n}`} onClick={() => add("lay", n)}>
              {n}
            </Chip>
          ))}
        </ChipRow>
      </div>
      <div className="space-y-2">
        {list.length === 0 && <p className="text-xs text-muted">None yet.</p>}
        {list.map((b) => (
          <div key={b.id} className="rounded-lg border border-gold/15 bg-black/25 px-2 py-2 text-sm space-y-1">
            <div className="flex justify-between gap-2">
              <span className="font-semibold">
                {kindLabel(b.kind, b.number)} · {phaseLabel(b.phase)}
              </span>
              <button
                type="button"
                className="text-xs text-danger"
                onClick={() => setList(list.filter((x) => x.id !== b.id))}
              >
                Remove
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs items-center">
              <label className="flex items-center gap-1">
                $
                <input
                  inputMode="numeric"
                  value={b.dollars ?? tableMin}
                  onChange={(e) =>
                    setList(
                      list.map((x) =>
                        x.id === b.id
                          ? { ...x, dollars: Math.max(1, Number(e.target.value) || tableMin) }
                          : x,
                      ),
                    )
                  }
                  className="w-16 h-7 rounded bg-black/40 border border-gold/20 px-1"
                />
              </label>
              {(b.kind === "pass" || b.kind === "dont" || b.kind === "come") && (
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={b.odds}
                    onChange={(e) =>
                      setList(list.map((x) => (x.id === b.id ? { ...x, odds: e.target.checked } : x)))
                    }
                  />
                  Odds
                </label>
              )}
              {(b.kind === "place" || b.kind === "buy" || b.kind === "lay") && (
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={b.workingComeout}
                    onChange={(e) =>
                      setList(
                        list.map((x) =>
                          x.id === b.id ? { ...x, workingComeout: e.target.checked } : x,
                        ),
                      )
                    }
                  />
                  Working on come out
                </label>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-[10px] uppercase tracking-widest text-muted">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 min-w-8 px-2 rounded-md text-xs border border-gold/30 bg-black/30"
    >
      {children}
    </button>
  );
}

function RuleRow({
  rule,
  onChange,
  onRemove,
}: {
  rule: StrategyRule;
  onChange: (r: StrategyRule) => void;
  onRemove: () => void;
}) {
  const when = rule.when;
  const action = rule.action;
  return (
    <div className="rounded-lg border border-gold/15 bg-black/25 px-2 py-2 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-xs text-muted">{ruleLine(rule)}</span>
        <button type="button" className="text-xs text-danger" onClick={onRemove}>
          Remove
        </button>
      </div>
      <label className="block text-xs">
        When
        <select
          value={when.kind}
          onChange={(e) =>
            onChange({ ...rule, when: { ...when, kind: e.target.value as WhenKind } })
          }
          className="mt-1 w-full h-9 rounded bg-black/40 border border-gold/20 px-2"
        >
          {WHEN_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {(when.kind === "hit" || when.kind === "hitsCount" || when.kind === "roll") && (
        <div>
          <p className="text-xs mb-1">Numbers (tap all that apply, 2–12)</p>
          <div className="grid grid-cols-6 gap-1">
            {ROLLS.map((n) => {
              const on = (when.numbers?.length ? when.numbers : when.number != null ? [when.number] : []).includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    const cur = when.numbers?.length
                      ? [...when.numbers]
                      : when.number != null
                        ? [when.number]
                        : [];
                    const next = cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort((a, b) => a - b);
                    onChange({
                      ...rule,
                      when: { ...when, numbers: next, number: next[0] },
                    });
                  }}
                  className={`h-8 rounded-md text-xs ${on ? "bg-gold text-felt-deep" : "bg-black/40"}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {when.kind === "hitsCount" && (
        <label className="block text-xs">
          After this many hits (example: 2)
          <input
            inputMode="numeric"
            value={when.hits ?? 2}
            onChange={(e) =>
              onChange({ ...rule, when: { ...when, hits: Math.max(1, Number(e.target.value) || 1) } })
            }
            className="mt-1 w-full h-9 rounded bg-black/40 border border-gold/20 px-2"
          />
        </label>
      )}
      <label className="block text-xs">
        Do
        <select
          value={action.kind}
          onChange={(e) =>
            onChange({ ...rule, action: { ...action, kind: e.target.value as ActionKind } })
          }
          className="mt-1 w-full h-9 rounded bg-black/40 border border-gold/20 px-2"
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {action.kind !== "reset" && (
        <label className="block text-xs">
          Target
          <select
            value={
              (action.target === "place" || action.target === "buy" || action.target === "lay") &&
              action.number
                ? `${action.target}-${action.number}`
                : action.target
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith("place-") || v.startsWith("buy-") || v.startsWith("lay-")) {
                const [kind, num] = v.split("-");
                onChange({
                  ...rule,
                  action: {
                    ...action,
                    target: kind as StrategyAction["target"],
                    number: Number(num) as Box,
                  },
                });
              } else {
                onChange({
                  ...rule,
                  action: { ...action, target: v as StrategyAction["target"], number: undefined },
                });
              }
            }}
            className="mt-1 w-full h-9 rounded bg-black/40 border border-gold/20 px-2"
          >
            <option value="this">The bet that just hit</option>
            <option value="all">All bets</option>
            <option value="pass">Pass</option>
            <option value="dont">Don&apos;t Pass</option>
            <option value="field">Field</option>
            {PLACE.map((n) => (
              <option key={`p${n}`} value={`place-${n}`}>
                Place {n}
              </option>
            ))}
            {BUY.map((n) => (
              <option key={`b${n}`} value={`buy-${n}`}>
                Buy {n}
              </option>
            ))}
            {PLACE.map((n) => (
              <option key={`l${n}`} value={`lay-${n}`}>
                Lay {n}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
