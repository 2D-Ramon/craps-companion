export function money(n: number, signed = false): string {
  const sign = signed ? (n > 0 ? "+" : n < 0 ? "-" : "") : n < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(n))}`;
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function when(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
