import { CRAPS_RULES } from "@/lib/rules";

export default function RulesPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-gold">Craps rules</h1>
      <div className="pit-card p-3 text-sm space-y-2">
        <p className="font-semibold text-gold">How this app works at the rail</p>
        <ol className="list-decimal pl-4 text-muted space-y-1">
          <li>Buy in on Table. Pick or create the strategy you will actually bet.</li>
          <li>Phones are usually banned on the rail — step away, tap the two dice or the total.</li>
          <li>Glance puck, last roll, bank, session P/L. Then get back.</li>
          <li>History replays those exact dice on other systems. Practice is a full layout with computer dice.</li>
        </ol>
      </div>
      <p className="text-sm text-muted">
        Below are discipline rules, not a betting system. Strategies live on the buy-in screen.
      </p>
      <ol className="space-y-3">
        {CRAPS_RULES.map((r) => (
          <li key={r.n} className="rounded-xl border border-gold/20 bg-black/25 px-3 py-3">
            <p className="text-gold text-xs tracking-widest uppercase">Rule {r.n}</p>
            <p className="font-semibold mt-0.5">{r.title}</p>
            <p className="text-sm text-muted mt-1">{r.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
