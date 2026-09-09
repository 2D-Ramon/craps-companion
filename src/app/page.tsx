"use client";

import { useState } from "react";
import { LiveTable } from "@/components/LiveTable";
import { useStore } from "@/lib/store";
import { STRATEGIES, STRATEGY_BLURB, STRATEGY_LABEL } from "@/lib/strategies";
import type { Goal, GoalKind, StrategyId } from "@/lib/types";

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        className="mt-1 w-full h-12 rounded-lg bg-black/30 border border-gold/25 px-3 text-base"
      />
    </label>
  );
}

export default function HomePage() {
  const { active, start } = useStore();
  const [casino, setCasino] = useState("River Spirit / Tulsa");
  const [buyIn, setBuyIn] = useState("300");
  const [min, setMin] = useState("10");
  const [strategyId, setStrategyId] = useState<StrategyId>("place-68");
  const [winKind, setWinKind] = useState<GoalKind | "none">("dollars");
  const [winVal, setWinVal] = useState("200");
  const [lossKind, setLossKind] = useState<GoalKind | "none">("dollars");
  const [lossVal, setLossVal] = useState("150");
  const [puckOn, setPuckOn] = useState(false);
  const [point, setPoint] = useState<4 | 5 | 6 | 8 | 9 | 10>(4);
  const [fieldHigh, setFieldHigh] = useState(false);
  const [err, setErr] = useState("");

  const goal = (kind: GoalKind | "none", value: string): Goal | null =>
    kind === "none" ? null : { kind, value: Number(value) };

  function go() {
    const buy = Number(buyIn);
    const tableMin = Number(min);
    if (!(buy > 0) || !(tableMin > 0)) {
      setErr("Enter a buy-in and table min.");
      return;
    }
    if (winKind !== "none" && !(Number(winVal) > 0)) {
      setErr("Enter a win goal amount.");
      return;
    }
    if (lossKind !== "none" && !(Number(lossVal) > 0)) {
      setErr("Enter a loss limit amount.");
      return;
    }
    try {
      const id = start({
        casino,
        buyIn: buy,
        unit: tableMin,
        winGoal: goal(winKind, winVal),
        lossLimit: goal(lossKind, lossVal),
        table: {
          min: tableMin,
          fieldTwo: fieldHigh ? 3 : 2,
          fieldTwelve: fieldHigh ? 4 : 3,
          odds: "3-4-5x",
          vigUpFront: false,
        },
        strategyId,
        puckOn,
        point,
      });
      if (!id) setErr("Start did not create a session.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Start failed.");
    }
  }

  if (active) return <LiveTable />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-gold tracking-wide">Buy in</h1>
        <p className="text-sm text-muted mt-1">
          Set the table, pick a strategy, then step away and tap rolls as they happen.
        </p>
      </div>

      <label className="block text-sm">
        Casino
        <input
          value={casino}
          onChange={(e) => setCasino(e.target.value)}
          className="mt-1 w-full h-12 rounded-lg bg-black/30 border border-gold/25 px-3 text-base"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <MoneyInput label="Buy-in $" value={buyIn} onChange={setBuyIn} />
        <MoneyInput label="Table min $" value={min} onChange={setMin} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Win goal
          <select
            value={winKind}
            onChange={(e) => setWinKind(e.target.value as GoalKind | "none")}
            className="mt-1 w-full h-11 rounded-lg bg-black/30 border border-gold/25 px-2 text-base"
          >
            <option value="none">None</option>
            <option value="dollars">Dollars</option>
            <option value="percent">% of buy-in</option>
            <option value="units">Units</option>
            <option value="minutes">Minutes</option>
          </select>
          {winKind !== "none" && (
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={winVal}
              onChange={(e) => setWinVal(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mt-2 w-full h-11 rounded-lg bg-black/30 border border-gold/25 px-3 text-base"
            />
          )}
        </label>
        <label className="block text-sm">
          Loss limit
          <select
            value={lossKind}
            onChange={(e) => setLossKind(e.target.value as GoalKind | "none")}
            className="mt-1 w-full h-11 rounded-lg bg-black/30 border border-gold/25 px-2 text-base"
          >
            <option value="none">None</option>
            <option value="dollars">Dollars</option>
            <option value="percent">% of buy-in</option>
            <option value="units">Units</option>
          </select>
          {lossKind !== "none" && (
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={lossVal}
              onChange={(e) => setLossVal(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mt-2 w-full h-11 rounded-lg bg-black/30 border border-gold/25 px-3 text-base"
            />
          )}
        </label>
      </div>

      {err && (
        <p className="rounded-lg bg-danger/20 border border-danger px-3 py-2 text-sm">{err}</p>
      )}

      <button
        type="button"
        onClick={() => go()}
        className="w-full h-16 rounded-xl bg-gold text-felt-deep font-semibold text-lg"
      >
        Start session
      </button>

      <div>
        <p className="text-sm mb-2">Strategy (real money)</p>
        <div className="space-y-2">
          {STRATEGIES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setStrategyId(id)}
              className={`w-full text-left rounded-xl px-3 py-3 border ${
                strategyId === id ? "border-gold bg-gold/15" : "border-gold/20 bg-black/20"
              }`}
            >
              <div className="font-semibold">{STRATEGY_LABEL[id]}</div>
              <div className="text-xs text-muted">{STRATEGY_BLURB[id]}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gold/20 bg-black/20 p-3 space-y-2">
        <p className="text-sm font-semibold">Field pays</p>
        <p className="text-sm text-muted">
          {fieldHigh
            ? "1x on 3, 4, 9, 10, 11 · 3x on 2 · 4x on 12"
            : "1x on 3, 4, 9, 10, 11 · 2x on 2 · 3x on 12"}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={fieldHigh} onChange={(e) => setFieldHigh(e.target.checked)} />
          This table is the high field (3x on 2, 4x on 12)
        </label>
      </div>

      <div className="rounded-xl border border-gold/20 bg-black/20 p-3 space-y-2">
        <p className="text-sm font-semibold">First roll — is the puck on?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPuckOn(false)}
            className={`flex-1 h-11 rounded-lg ${!puckOn ? "bg-gold text-felt-deep" : "bg-black/30"}`}
          >
            Come out
          </button>
          <button
            type="button"
            onClick={() => setPuckOn(true)}
            className={`flex-1 h-11 rounded-lg ${puckOn ? "bg-gold text-felt-deep" : "bg-black/30"}`}
          >
            Point on
          </button>
        </div>
        {puckOn && (
          <div className="grid grid-cols-6 gap-1">
            {([4, 5, 6, 8, 9, 10] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPoint(n)}
                className={`h-10 rounded-md ${point === n ? "bg-gold text-felt-deep" : "bg-black/30"}`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
