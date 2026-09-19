"use client";

import { useState } from "react";
import { StrategyBuilder } from "@/components/StrategyBuilder";
import {
  STRATEGIES,
  STRATEGY_BLURB,
  STRATEGY_LABEL,
  describeCustom,
  strategyLabel,
} from "@/lib/strategies";
import { useStore } from "@/lib/store";
import type { StrategyId } from "@/lib/types";

export function StrategyPicker({
  value,
  onChange,
  tableMin = 10,
}: {
  value: StrategyId;
  onChange: (id: StrategyId) => void;
  tableMin?: number;
}) {
  const { customStrategies, deleteCustom } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <p className="text-sm mb-1">Strategy (real money)</p>
      <p className="text-xs text-gold mb-2">Using: {strategyLabel(value, customStrategies)}</p>
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
        <StrategyBuilder
          tableMin={tableMin}
          onCancel={() => setOpen(false)}
          onSaved={(id) => {
            onChange(id);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
