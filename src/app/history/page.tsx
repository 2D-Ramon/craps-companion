"use client";

import { useRouter } from "next/navigation";
import { money, when } from "@/lib/format";
import { STRATEGY_LABEL } from "@/lib/strategies";
import { useStore } from "@/lib/store";

export default function HistoryPage() {
  const { sessions, resume, active } = useStore();
  const router = useRouter();

  if (!sessions.length) {
    return <p className="text-muted pt-8">Finished sessions land here. Replay comes next.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-gold">History</h1>
      {sessions.map((s) => {
        const live = active?.id === s.id && !s.endedAt;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              if (live) router.push("/live");
              else if (!s.endedAt) {
                resume(s.id);
                router.push("/live");
              }
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
              {STRATEGY_LABEL[s.strategyId]}
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
      <p className="text-xs text-muted">
        Side-by-side replay of these exact rolls on other strategies is next. CSV export follows
        with accounts.
      </p>
    </div>
  );
}
