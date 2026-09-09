import { computeStats, windowRolls } from "@/lib/stats";
import { pct } from "@/lib/format";
import type { Roll, Total } from "@/lib/types";

export function GlancePercents({ rolls, windowSize = 90 }: { rolls: Roll[]; windowSize?: number }) {
  const slice = windowRolls(rolls, windowSize);
  const s = computeStats(slice);
  const nums: Total[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-muted mb-2">
        Last {Math.min(windowSize, rolls.length)} · actual vs true math
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {nums.map((n) => {
          const t = s.totals[n];
          const hot = t.pct > t.exp + 0.02;
          const cold = t.pct + 0.02 < t.exp;
          return (
            <div
              key={n}
              className={`rounded-md px-1 py-2 text-center border ${
                n === 7 ? "border-seven/50 bg-seven/20" : "border-gold/15 bg-black/25"
              }`}
            >
              <div className="text-sm font-semibold">{n}</div>
              <div className={`text-sm font-bold leading-tight ${hot ? "text-win" : cold ? "text-muted" : "text-ink"}`}>
                {s.n ? pct(t.pct) : "—"}
              </div>
              <div className="text-[13px] font-semibold text-gold-soft mt-0.5">{pct(t.exp)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
