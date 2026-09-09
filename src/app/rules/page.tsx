import { CRAPS_RULES } from "@/lib/rules";

export default function RulesPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-gold">Craps rules</h1>
      <p className="text-sm text-muted">
        These are discipline rules, not a betting system. Strategies live on the buy-in screen.
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
