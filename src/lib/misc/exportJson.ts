/**
 * Round a number to a given number of decimal places (matching display precision).
 */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Round all numeric values in an object/array according to a field-level precision map.
 * Fields not in the map are rounded to 0 decimals by default.
 *
 * @param value - The value to process (object, array, or primitive).
 * @param precisionMap - Map of field name → decimal places to use for rounding.
 */
function roundByField(
  value: unknown,
  precisionMap: Record<string, number>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => roundByField(item, precisionMap));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => {
        if (typeof v === "number") {
          const decimals = precisionMap[k] ?? 0;
          return [k, round(v, decimals)];
        }
        return [k, roundByField(v, precisionMap)];
      }),
    );
  }
  return value;
}

/**
 * Triggers a browser download of a JSON file.
 * Numeric values are rounded to match their display precision via the provided precision map.
 *
 * @param payload - The data to serialize. Shaped as `{ totals, rows }` by convention.
 * @param filename - The suggested filename (e.g. "customerValue_byZipCode.json").
 * @param precisionMap - Map of field name → decimal places (defaults to 0 for unlisted fields).
 */
export function exportJson(
  payload: unknown,
  filename: string,
  precisionMap: Record<string, number> = {},
): void {
  const json = JSON.stringify(roundByField(payload, precisionMap), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
