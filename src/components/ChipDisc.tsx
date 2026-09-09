export const CHIP_LOOK: Record<number, { bg: string; ring: string; fg: string; edge: string }> = {
  1: { bg: "#f4f1e8", ring: "#c23b2e", fg: "#1a120c", edge: "#d8d2c4" },
  5: { bg: "#c23b2e", ring: "#f4f1e8", fg: "#fff", edge: "#8e241c" },
  10: { bg: "#1e4d8c", ring: "#f4f1e8", fg: "#fff", edge: "#14325c" },
  25: { bg: "#1f7a4d", ring: "#f4f1e8", fg: "#fff", edge: "#145c38" },
  100: { bg: "#1a1a1a", ring: "#c9a227", fg: "#f4f1e8", edge: "#000" },
  500: { bg: "#6b2fa0", ring: "#f4f1e8", fg: "#fff", edge: "#4a1d73" },
};

export function chipLookFor(amount: number) {
  if (amount >= 500) return CHIP_LOOK[500];
  if (amount >= 100) return CHIP_LOOK[100];
  if (amount >= 25) return CHIP_LOOK[25];
  if (amount >= 10) return CHIP_LOOK[10];
  if (amount >= 5) return CHIP_LOOK[5];
  return CHIP_LOOK[1];
}

export function ChipDisc({
  denom,
  selected = false,
  onClick,
  size = 44,
}: {
  denom: number;
  selected?: boolean;
  onClick?: () => void;
  size?: number;
}) {
  const look = CHIP_LOOK[denom] ?? CHIP_LOOK[5];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`$${denom} chip`}
      aria-pressed={selected}
      className={`chip-disc ${selected ? "on" : ""}`}
      style={{
        width: size,
        height: size,
        background: look.bg,
        color: look.fg,
        boxShadow: `0 0 0 3px ${look.ring}, 0 0 0 5px ${look.edge}, 0 3px 0 ${look.edge}, 0 4px 8px rgba(0,0,0,.45)`,
      }}
    >
      ${denom}
    </button>
  );
}

export function ChipStack({ amount }: { amount: number; compact?: boolean }) {
  if (!amount) return null;
  const look = chipLookFor(amount);
  return (
    <span
      className="table-chip"
      aria-label={`$${Math.round(amount)}`}
      style={{
        background: look.bg,
        color: look.fg,
        borderColor: look.ring,
      }}
    >
      ${Math.round(amount)}
    </span>
  );
}
