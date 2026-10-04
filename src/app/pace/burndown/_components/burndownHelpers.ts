export function formatDollars(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}
