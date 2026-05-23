export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes)) return "—";
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  return `${minutes.toFixed(1)}m`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}
