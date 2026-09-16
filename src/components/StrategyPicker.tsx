"use client";

import { useRef, useState } from "react";
import { parseStrategyText } from "@/lib/parseStrategy";
import {
  STRATEGIES,
  STRATEGY_BLURB,
  STRATEGY_LABEL,
  customIsValid,
  describeCustom,
} from "@/lib/strategies";
import { useStore } from "@/lib/store";
import type { Box, StrategyId } from "@/lib/types";

const PLACE: Box[] = [4, 5, 6, 8, 9, 10];

export function StrategyPicker({
  value,
  onChange,
}: {
  value: StrategyId;
  onChange: (id: StrategyId) => void;
}) {
  const { customStrategies, saveCustom, deleteCustom } = useStore();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const [pass, setPass] = useState(false);
  const [dont, setDont] = useState(false);
  const [field, setField] = useState(false);
  const [place, setPlace] = useState<Box[]>([]);

  function togglePlace(n: Box) {
    setPlace((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort((a, b) => a - b)));
  }

  function save() {
    const draft = { name, pass, dont, field, place };
    const problem = customIsValid(draft);
    if (problem) {
      setErr(problem);
      return;
    }
    const id = saveCustom(draft);
    onChange(id);
    setOpen(false);
    setErr("");
    setName("");
    setPass(false);
    setDont(false);
    setField(false);
    setPlace([]);
  }

  return (
    <div>
      <p className="text-sm mb-2">Strategy (real money)</p>
      <div className="space-y-2">
        {STRATEGIES.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`w-full text-left rounded-xl px-3 py-3 border ${
              value === id ? "border-gold bg-gold/15" : "border-gold/20 bg-black/20"
            }`}
          >
            <div className="font-semibold">{STRATEGY_LABEL[id]}</div>
            <div className="text-xs text-muted">{STRATEGY_BLURB[id]}</div>
          </button>
        ))}
        {customStrategies.map((c) => (
          <div
            key={c.id}
            className={`rounded-xl border px-3 py-3 ${
              value === c.id ? "border-gold bg-gold/15" : "border-gold/20 bg-black/20"
            }`}
          >
            <button type="button" onClick={() => onChange(c.id)} className="w-full text-left">
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-muted">{describeCustom(c)}</div>
            </button>
            <button
              type="button"
              onClick={() => {
                if (value === c.id) onChange("place-68");
                deleteCustom(c.id);
              }}
              className="mt-2 text-xs text-danger"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 w-full h-12 rounded-xl border border-gold/40 text-gold font-semibold"
        >
          Create a strategy
        </button>
      ) : (
        <CustomForm
          name={name}
          setName={setName}
          pass={pass}
          setPass={(v) => {
            setPass(v);
            if (v) setDont(false);
          }}
          dont={dont}
          setDont={(v) => {
            setDont(v);
            if (v) setPass(false);
          }}
          field={field}
          setField={setField}
          place={place}
          setPlace={setPlace}
          togglePlace={togglePlace}
          err={err}
          setErr={setErr}
          onSave={save}
          onCancel={() => {
            setOpen(false);
            setErr("");
          }}
        />
      )}
    </div>
  );
}

export function CustomForm({
  name,
  setName,
  pass,
  setPass,
  dont,
  setDont,
  field,
  setField,
  place,
  setPlace,
  togglePlace,
  err,
  setErr,
  onSave,
  onCancel,
}: {
  name: string;
  setName: (v: string) => void;
  pass: boolean;
  setPass: (v: boolean) => void;
  dont: boolean;
  setDont: (v: boolean) => void;
  field: boolean;
  setField: (v: boolean) => void;
  place: Box[];
  setPlace: (v: Box[]) => void;
  togglePlace: (n: Box) => void;
  err: string;
  setErr: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const [building, setBuilding] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);

  function applyParsed(p: { name: string; pass: boolean; dont: boolean; field: boolean; place: Box[] }) {
    setName(p.name);
    setPass(p.pass);
    setDont(p.dont);
    setField(p.field);
    setPlace(p.place);
    setErr("");
  }

  async function buildFrom(text: string) {
    const said = text.trim();
    if (!said) {
      setErr("Type or speak a strategy first.");
      return;
    }
    setBuilding(true);
    setErr("");
    try {
      const res = await fetch("/api/strategy-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: said }),
      });
      const data = (await res.json()) as {
        name?: string;
        pass?: boolean;
        dont?: boolean;
        field?: boolean;
        place?: Box[];
        error?: string;
      };
      if (!res.ok || data.error) {
        applyParsed(parseStrategyText(said));
      } else {
        applyParsed({
          name: data.name || "Custom",
          pass: Boolean(data.pass),
          dont: Boolean(data.dont),
          field: Boolean(data.field),
          place: data.place ?? [],
        });
      }
    } catch {
      applyParsed(parseStrategyText(said));
    } finally {
      setBuilding(false);
    }
  }

  function toggleListen() {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setErr("This browser can't listen. Type the strategy instead.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      recRef.current = null;
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (ev) => {
      const said = ev.results[0]?.[0]?.transcript ?? "";
      if (said) {
        setPrompt(said);
        void buildFrom(said);
      }
    };
    rec.onerror = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <div className="mt-3 rounded-xl border border-gold/40 bg-black/35 p-3 space-y-3">
      <p className="font-semibold text-gold">Your strategy</p>
      <p className="text-xs text-muted">
        Type it or speak it in plain English. We build the bets. Fix anything that looks wrong, then
        save. Odds go up automatically on Pass / Don&apos;t when a point is set.
      </p>
      <label className="block text-sm">
        Type or speak
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder='e.g. "Place the 6 and 8 and a field" or "Iron Cross"'
          className="mt-1 w-full rounded-lg bg-black/30 border border-gold/25 px-3 py-2 text-base"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={toggleListen}
          className={`h-11 rounded-lg border text-sm font-semibold ${
            listening ? "border-gold bg-gold text-felt-deep" : "border-gold/40 text-gold"
          }`}
        >
          {listening ? "Listening… tap to stop" : "Speak"}
        </button>
        <button
          type="button"
          onClick={() => void buildFrom(prompt)}
          disabled={building}
          className="h-11 rounded-lg bg-gold text-felt-deep font-semibold text-sm disabled:opacity-60"
        >
          {building ? "Building…" : "Build with AI"}
        </button>
      </div>
      <label className="block text-sm">
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Inside + field"
          className="mt-1 w-full h-11 rounded-lg bg-black/30 border border-gold/25 px-3 text-base"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Toggle on={pass} onClick={() => setPass(!pass)} label="Pass line" />
        <Toggle on={dont} onClick={() => setDont(!dont)} label="Don't Pass" />
      </div>
      <div>
        <p className="text-sm mb-2">Place numbers</p>
        <div className="grid grid-cols-6 gap-1">
          {PLACE.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => togglePlace(n)}
              className={`h-10 rounded-md text-sm ${
                place.includes(n) ? "bg-gold text-felt-deep" : "bg-black/30"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <Toggle on={field} onClick={() => setField(!field)} label="Field" />
      {err && <p className="text-sm text-danger">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="h-11 rounded-lg bg-black/30 border border-gold/20">
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="h-11 rounded-lg bg-gold text-felt-deep font-semibold"
        >
          Save & use
        </button>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-lg border text-sm ${
        on ? "border-gold bg-gold/15" : "border-gold/20 bg-black/20"
      }`}
    >
      {label}
    </button>
  );
}

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};
