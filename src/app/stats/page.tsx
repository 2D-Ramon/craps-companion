"use client";

import { GlancePercents } from "@/components/GlancePercents";
import { RollStrip } from "@/components/RollStrip";
import { pct } from "@/lib/format";
import { computeStats } from "@/lib/stats";
import { useStore } from "@/lib/store";

export default function StatsPage() {
  const { active, sessions } = useStore();
  const session = active ?? sessions[0];
  if (!session || !session.rolls.length) {
    return <p className="text-muted pt-8">Log a few rolls and the board fills in here.</p>;
  }
  const s = computeStats(session.rolls);
  const avg =
    s.rollsPerShooter.length > 0
      ? (s.rollsPerShooter.reduce((a, b) => a + b, 0) / s.rollsPerShooter.length).toFixed(1)
      : "—";

  return (
    <div className="space-y-5">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-gold">Stats</h1>
      <p className="text-sm text-muted">
        {session.rolls.length} rolls · {s.sevenOuts} seven-outs · {s.pointsMade} points made · {avg}{" "}
        rolls/shooter
      </p>

      <GlancePercents rolls={session.rolls} windowSize={90} />

      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted mb-2">Last 21</p>
        <RollStrip rolls={session.rolls} n={21} withPuck />
      </div>

      <section>
        <h2 className="text-sm font-semibold mb-2">Grouped pairs</h2>
        <div className="space-y-1">
          {s.groups.map((g) => (
            <div key={g.key} className="flex justify-between text-sm bg-black/25 rounded-lg px-3 py-2">
              <span>{g.key}</span>
              <span>
                {g.count} · {pct(g.pct)}{" "}
                <span className="text-muted">({pct(g.exp)})</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-2">Hard vs easy</h2>
        <div className="grid grid-cols-4 gap-2">
          {([4, 6, 8, 10] as const).map((n) => (
            <div key={n} className="bg-black/25 rounded-lg px-2 py-2 text-center text-sm">
              <div className="text-muted text-xs">{n}</div>
              <div>H {s.hard[n].hard}</div>
              <div>E {s.hard[n].easy}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-2">36 faces</h2>
        <p className="text-xs text-muted mb-2">
          {s.knownFaces} rolls with a known pair. Totals-only taps are left off this grid.
        </p>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
          <div />
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={`h${n}`} className="text-muted">
              {n}
            </div>
          ))}
          {s.faces.map((row, i) => (
            <div key={`r${i}`} className="contents">
              <div className="text-muted self-center">{i + 1}</div>
              {row.map((c, j) => (
                <div key={`${i}-${j}`} className="h-8 rounded bg-black/30 flex items-center justify-center">
                  {c || ""}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {s.repeaters.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2">Repeaters</h2>
          <div className="flex flex-wrap gap-2">
            {s.repeaters.map((r) => (
              <span key={r.total} className="px-2 py-1 rounded-md bg-black/30 text-sm">
                {r.total} × {r.max}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
