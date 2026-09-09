"use client";

import { useEffect, useState } from "react";
import { DicePad } from "@/components/DicePad";
import { GlancePercents } from "@/components/GlancePercents";
import { RollStrip } from "@/components/RollStrip";
import { money } from "@/lib/format";
import { puckLabel } from "@/lib/puck";
import { STRATEGY_LABEL } from "@/lib/strategies";
import { useStore } from "@/lib/store";
import type { Die } from "@/lib/types";
import { asTotal } from "@/lib/dice";

export function LiveTable() {
  const { active, addPair, addTotal, undo, replaceLast, setPuck, end, goalBanner, clearBanner } =
    useStore();
  const [edit, setEdit] = useState(false);
  const [ea, setEa] = useState<Die | "">("");
  const [eb, setEb] = useState<Die | "">("");

  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    const grab = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        /* pit / unsupported */
      }
    };
    grab();
    const vis = () => {
      if (document.visibilityState === "visible") grab();
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      void lock?.release();
    };
  }, []);

  if (!active) return null;

  const last = active.rolls[active.rolls.length - 1];
  const win = active.pnl >= 0;

  function saveEdit() {
    if (!last) return;
    if (ea && eb) replaceLast(ea, eb, asTotal(Number(ea) + Number(eb)));
    setEdit(false);
  }

  return (
    <div className="space-y-4">
      {goalBanner && (
        <button
          type="button"
          onClick={clearBanner}
          className="w-full rounded-xl bg-gold text-felt-deep px-3 py-3 font-semibold text-left"
        >
          {goalBanner}
          <span className="block text-xs font-normal opacity-80">Tap to dismiss. Keep logging rolls.</span>
        </button>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted">
            {active.puck.on ? "Puck on" : "Puck off"}
          </p>
          <p className="font-[family-name:var(--font-display)] text-4xl text-gold leading-none">
            {puckLabel(active.puck)}
          </p>
          <p className="text-sm text-muted mt-1">
            Shooter {active.shooter} · {active.rolls.length}/200
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-widest text-muted">Last roll</p>
          <p className={`text-4xl font-semibold leading-none ${last?.total === 7 ? "text-seven" : ""}`}>
            {last ? last.total : "—"}
          </p>
          <p className="text-xs text-muted">
            {last?.a && last?.b ? `${last.a}-${last.b}` : last ? "total only" : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Bankroll" value={money(active.bankroll)} />
        <Stat label="Session" value={money(active.pnl, true)} tone={win ? "win" : "loss"} />
        <Stat
          label={
            active.rolls.some((r) => r.shooter === active.shooter) || !active.lastShooter
              ? "This shooter"
              : `Shooter ${active.lastShooter} 7-out`
          }
          value={money(
            active.rolls.some((r) => r.shooter === active.shooter) || !active.lastShooter
              ? active.shooterPnl
              : active.lastShooterPnl || 0,
            true
          )}
        />
        <Stat label="Strategy" value={STRATEGY_LABEL[active.strategyId]} small />
      </div>

      {(active.winGoal || active.lossLimit) && (
        <div className="flex justify-between text-xs text-muted px-1">
          <span>Win {active.winGoal ? `${active.winGoal.value} ${active.winGoal.kind}` : "—"}</span>
          <span>Loss {active.lossLimit ? `${active.lossLimit.value} ${active.lossLimit.kind}` : "—"}</span>
        </div>
      )}
      <p className="text-xs text-muted px-1">
        Field: 1x on 3/4/9/10/11 · {active.table.fieldTwo}x on 2 · {active.table.fieldTwelve}x on 12
      </p>

      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted mb-2">Last 21</p>
        <RollStrip rolls={active.rolls} n={21} withPuck />
      </div>

      <GlancePercents rolls={active.rolls} windowSize={90} />

      <DicePad onPair={addPair} onTotal={addTotal} disabled={active.rolls.length >= 200} />

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={undo} className="h-12 rounded-lg bg-black/35 border border-gold/25">
          Undo
        </button>
        <button
          type="button"
          onClick={() => {
            setEdit((v) => !v);
            if (last) {
              setEa((last.a ?? "") as Die | "");
              setEb((last.b ?? "") as Die | "");
            }
          }}
          className="h-12 rounded-lg bg-black/35 border border-gold/25"
        >
          Edit last
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("End this session?")) end();
          }}
          className="h-12 rounded-lg border border-danger/50 text-danger"
        >
          End
        </button>
      </div>

      {edit && last && (
        <div className="rounded-xl border border-gold/30 bg-black/40 p-3 space-y-2">
          <p className="text-sm">Fix last roll (now {last.total})</p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={ea}
              onChange={(e) => setEa(e.target.value ? (Number(e.target.value) as Die) : "")}
              placeholder="die 1"
              className="flex-1 h-11 rounded-lg bg-black/30 border border-gold/25 px-3"
            />
            <input
              type="text"
              inputMode="numeric"
              value={eb}
              onChange={(e) => setEb(e.target.value ? (Number(e.target.value) as Die) : "")}
              placeholder="die 2"
              className="flex-1 h-11 rounded-lg bg-black/30 border border-gold/25 px-3"
            />
          </div>
          <button type="button" onClick={saveEdit} className="w-full h-11 rounded-lg bg-gold text-felt-deep font-semibold">
            Save pair
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gold/20 bg-black/20 p-3">
        <p className="text-xs text-muted mb-2">Missed a call? Set the puck.</p>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setPuck(false)}
            className={`flex-1 h-10 rounded-lg text-sm ${!active.puck.on ? "bg-gold text-felt-deep" : "bg-black/30"}`}
          >
            Come out
          </button>
          <button
            type="button"
            onClick={() => setPuck(true, active.puck.on ? active.puck.point : 4)}
            className={`flex-1 h-10 rounded-lg text-sm ${active.puck.on ? "bg-gold text-felt-deep" : "bg-black/30"}`}
          >
            Point on
          </button>
        </div>
        {active.puck.on && (
          <div className="grid grid-cols-6 gap-1">
            {([4, 5, 6, 8, 9, 10] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPuck(true, n)}
                className={`h-9 rounded-md text-sm ${
                  active.puck.on && active.puck.point === n ? "bg-gold text-felt-deep" : "bg-black/30"
                }`}
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

function Stat({
  label,
  value,
  tone,
  small,
}: {
  label: string;
  value: string;
  tone?: "win" | "loss";
  small?: boolean;
}) {
  return (
    <div className="rounded-xl bg-black/30 border border-gold/15 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p
        className={`${small ? "text-sm" : "text-xl"} font-semibold ${
          tone === "win" ? "text-win" : tone === "loss" ? "text-danger" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
