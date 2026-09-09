import { decorateRolls } from "@/lib/rollMarks";
import type { Puck, Roll } from "@/lib/types";

export function RollStrip({
  rolls,
  n = 21,
  startPuck,
  withPuck = false,
}: {
  rolls: Roll[];
  n?: number;
  startPuck?: Puck | null;
  withPuck?: boolean;
}) {
  const tagged = withPuck
    ? decorateRolls(rolls, startPuck).slice(-n).reverse()
    : rolls
        .slice(-n)
        .reverse()
        .map((r) => {
          const hard = !!(r.a && r.b && r.a === r.b && (r.total === 4 || r.total === 6 || r.total === 8 || r.total === 10));
          return {
            roll: r,
            mark: hard ? "H" : r.a && r.b ? `${r.a}-${r.b}` : "",
            cls: (r.total === 7 ? "out" : "") as "out" | "",
          };
        });

  if (!tagged.length) {
    return <p className="text-muted text-sm">No rolls yet.</p>;
  }

  const cls: Record<string, string> = {
    onset: "bg-gold/20 border-gold text-gold",
    hit: "bg-win/20 border-win text-win",
    out: "bg-seven text-white border-seven",
    nat: "bg-win/20 border-win",
    craps: "bg-black/40 border-gold/20",
    working: "bg-black/35 border-gold/50",
    "": "bg-black/35 border-gold/20",
  };

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {tagged.map((t, i) => (
          <div
            key={`${t.roll.at}-${i}`}
            className={`shrink-0 w-11 h-14 rounded-md flex flex-col items-center justify-center text-sm font-semibold border ${cls[t.cls] || cls[""]}`}
          >
            <span>{t.roll.total}</span>
            {t.mark ? <span className="text-[9px] font-bold tracking-wide mt-0.5">{t.mark}</span> : null}
          </div>
        ))}
      </div>
      {withPuck ? (
        <p className="text-[11px] text-muted mt-1 leading-snug">
          Gold ON = point established · Green HIT = point made · Red 7 OUT · NAT = come-out 7/11 · P8 = point is 8 · H = hard 4/6/8/10
        </p>
      ) : null}
    </div>
  );
}
