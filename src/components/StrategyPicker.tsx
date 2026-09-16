"use client";

import { useState } from "react";
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
          togglePlace={togglePlace}
          err={err}
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
  togglePlace,
  err,
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
  togglePlace: (n: Box) => void;
  err: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-gold/40 bg-black/35 p-3 space-y-3">
      <p className="font-semibold text-gold">Your strategy</p>
      <p className="text-xs text-muted">
        Name it, pick the bets you want working every shooter. Odds go up automatically on Pass /
        Don&apos;t when a point is set.
      </p>
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
