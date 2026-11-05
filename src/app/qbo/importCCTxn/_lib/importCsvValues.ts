// Pure value parsers shared by the bank formats. Each returns null when the value is not valid,
// so the format can report which column was bad.

/** "10/27/2026" to "2026-10-27". Rejects impossible dates such as 02/30/2026. */
export function parseUsDateToIso(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealDate) return null;

  return `${match[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Whole cents from a decimal string, without floating point. "-53.68" is -5368. */
export function parseMoneyToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,]/g, "");
  const match = cleaned.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;

  const cents = Number(match[2]) * 100 + Number((match[3] ?? "").padEnd(2, "0"));
  if (cents === 0) return 0;
  return match[1] ? -cents : cents;
}

export function parseLast4(raw: string): string | null {
  const trimmed = raw.trim();
  return /^\d{4}$/.test(trimmed) ? trimmed : null;
}

export function collapseWhitespace(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}
