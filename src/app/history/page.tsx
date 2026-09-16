"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RollStrip } from "@/components/RollStrip";
import { money, when } from "@/lib/format";
import {
  STRATEGIES,
  describeCustom,
  lookupCustom,
  simulateOnRolls,
  strategyLabel,
} from "@/lib/strategies";
import { useStore } from "@/lib/store";
import type { Session, StrategyId } from "@/lib/types";

const MAX_REPLAY = 5;

export default function HistoryPage() {
  const { sessions, resume, active, customStrategies } = useStore();
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const session = sessions.find((s) => s.id === openId) ?? null;

  if (!sessions.length) {
    return <p className="text-muted pt-8">Finished sessions land here. Replay their dice on other strategies.</p>;
  }

  if (session) {
    return (
      <ReplayView
        session={session}
        live={active?.id === session.id && !session.endedAt}
        onBack={() => setOpenId(null)}
        onResume={() => {
          resume(session.id);
          router.push("/live");
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-gold">History</h1>
      <p className="text-sm text-muted">
        Open a session to replay those exact dice on up to {MAX_REPLAY} strategies — including
        track-only rolls.
      </p>
      {sessions.map((s) => {
        const live = active?.id === s.id && !s.endedAt;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              if (live) router.push("/live");
              else setOpenId(s.id);
            }}
            className="w-full text-left rounded-xl border border-gold/20 bg-black/25 px-3 py-3"
          >
            <div className="flex justify-between">
              <span className="font-semibold">{s.casino || "Table"}</span>
              <span className={s.pnl >= 0 ? "text-win" : "text-danger"}>{money(s.pnl, true)}</span>
            </div>
            <p className="text-xs text-muted mt-1">
              {when(s.startedAt)}
              {s.endedAt ? ` → ${when(s.endedAt)}` : " · open"} · {s.rolls.length} rolls ·{" "}
              {strategyLabel(s.strategyId, customStrategies)}
              {live ? " · LIVE" : ""}
            </p>
            {(s.goalHitAt || s.lossHitAt) && (
              <p className="text-xs text-gold mt-1">
                {s.goalHitAt ? "Win goal hit" : ""}
                {s.goalHitAt && s.lossHitAt ? " · " : ""}
                {s.lossHitAt ? "Loss limit hit" : ""}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ReplayView({
  session,
  live,
  onBack,
  onResume,
}: {
  session: Session;
  live: boolean;
  onBack: () => void;
  onResume: () => void;
}) {
  const { customStrategies } = useStore();
  const original = session.strategyId;
  const [picked, setPicked] = useState<StrategyId[]>(() => [original]);

  const options: { id: StrategyId; name: string; blurb: string }[] = [
    ...STRATEGIES.map((id) => ({
      id,
      name: strategyLabel(id),
      blurb: "",
    })),
    ...customStrategies.map((c) => ({
      id: c.id,
      name: c.name,
      blurb: describeCustom(c),
    })),
  ];
  if (!options.some((o) => o.id === original)) {
    options.unshift({
      id: original,
      name: strategyLabel(original, customStrategies),
      blurb: "Followed this session",
    });
  }

  function toggle(id: StrategyId) {
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX_REPLAY) return cur;
      return [...cur, id];
    });
  }

  const results = useMemo(() => {
    if (!session.rolls.length) return [];
    return picked.map((id) => {
      const custom = lookupCustom(id, customStrategies);
      const { pnl } = simulateOnRolls(id, session.table, session.rolls, custom);
      return { id, pnl, original: id === original };
    });
  }, [picked, session, customStrategies, original]);

  const ranked = [...results].sort((a, b) => b.pnl - a.pnl);

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-gold">
        ← History
      </button>
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-gold">
          {session.casino || "Table"}
        </h1>
        <p className="text-sm text-muted mt-1">
          {when(session.startedAt)}
          {session.endedAt ? ` → ${when(session.endedAt)}` : " · open"} · {session.rolls.length}{" "}
          rolls · followed {strategyLabel(original, customStrategies)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-black/30 border border-gold/15 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-widest text-muted">Actual P/L</p>
          <p className={`text-xl font-semibold ${session.pnl >= 0 ? "text-win" : "text-danger"}`}>
            {money(session.pnl, true)}
          </p>
        </div>
        <div className="rounded-xl bg-black/30 border border-gold/15 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-widest text-muted">Buy-in</p>
          <p className="text-xl font-semibold">{money(session.buyIn)}</p>
        </div>
      </div>

      {session.rolls.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted mb-2">These dice</p>
          <RollStrip rolls={session.rolls} n={21} withPuck />
        </div>
      )}

      {!session.endedAt && (
        <button
          type="button"
          onClick={onResume}
          className="w-full h-12 rounded-xl bg-gold text-felt-deep font-semibold"
        >
          {live ? "Back to live table" : "Resume session"}
        </button>
      )}

      {session.rolls.length === 0 ? (
        <p className="text-sm text-muted">No rolls on this session yet — nothing to replay.</p>
      ) : (
        <>
          <div>
            <p className="text-sm font-semibold">Replay on other strategies</p>
            <p className="text-xs text-muted mt-1">
              Same dice, same table min / field. Pick up to {MAX_REPLAY}. Works for a strategy you
              followed and for track-only sessions.
            </p>
          </div>
          <div className="space-y-2">
            {options.map((opt) => {
              const on = picked.includes(opt.id);
              const full = !on && picked.length >= MAX_REPLAY;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={full}
                  onClick={() => toggle(opt.id)}
                  className={`w-full text-left rounded-xl px-3 py-3 border ${
                    on ? "border-gold bg-gold/15" : "border-gold/20 bg-black/20"
                  } ${full ? "opacity-40" : ""}`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">{opt.name}</span>
                    {opt.id === original && (
                      <span className="text-[10px] uppercase tracking-widest text-gold">Followed</span>
                    )}
                  </div>
                  {opt.blurb ? <p className="text-xs text-muted mt-0.5">{opt.blurb}</p> : null}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted">
            {picked.length}/{MAX_REPLAY} selected
          </p>

          {ranked.length > 0 && (
            <div className="rounded-xl border border-gold/20 bg-black/25 overflow-hidden">
              <p className="px-3 py-2 text-[11px] uppercase tracking-widest text-muted">
                Result on these {session.rolls.length} rolls
              </p>
              <ul>
                {ranked.map((r) => (
                  <li
                    key={r.id}
                    className="flex justify-between px-3 py-2.5 border-t border-gold/10 text-sm"
                  >
                    <span>
                      {strategyLabel(r.id, customStrategies)}
                      {r.original ? " · followed" : ""}
                    </span>
                    <span className={r.pnl >= 0 ? "text-win font-semibold" : "text-danger font-semibold"}>
                      {money(r.pnl, true)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
