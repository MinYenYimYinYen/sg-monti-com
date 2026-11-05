import { FormatDetection, ImportFormat } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";
import { capitalOneFormat } from "@/app/qbo/importCCTxn/_lib/formats/capitalOneFormat";
import { chaseFormat } from "@/app/qbo/importCCTxn/_lib/formats/chaseFormat";

// Formats are hardcoded as they come up. To add one: write a format file, then list it here.
export const importFormats: ImportFormat[] = [capitalOneFormat, chaseFormat];

function quoteList(names: string[]): string {
  return names.map((name) => `"${name}"`).join(", ");
}

/**
 * Exact match on the header columns (order ignored). A header that shares at least half of a
 * known format's columns is reported as that format with the columns changed, so a bank's
 * silent export change is noticed instead of misparsed.
 */
export function detectImportFormat(headers: string[]): FormatDetection {
  const headerSet = new Set(headers);

  const exactMatch = importFormats.find(
    (format) =>
      format.columns.length === headers.length &&
      format.columns.every((column) => headerSet.has(column)),
  );
  if (exactMatch) return { success: true, format: exactMatch };

  let closest: ImportFormat | null = null;
  let closestShared = 0;
  for (const format of importFormats) {
    const shared = format.columns.filter((column) => headerSet.has(column)).length;
    if (shared > closestShared) {
      closest = format;
      closestShared = shared;
    }
  }

  if (closest && closestShared * 2 >= closest.columns.length) {
    const expected = new Set(closest.columns);
    const added = headers.filter((header) => !expected.has(header));
    const missing = closest.columns.filter((column) => !headerSet.has(column));
    const changes: string[] = [];
    if (added.length > 0) changes.push(`Added: ${quoteList(added)}.`);
    if (missing.length > 0) changes.push(`Missing: ${quoteList(missing)}.`);
    return {
      success: false,
      error: `This looks like a ${closest.label} import, but the columns have changed. ${changes.join(" ")} The importer must be updated before this file can be used.`,
    };
  }

  return {
    success: false,
    error: `Unrecognized CSV columns: ${quoteList(headers)}. Known formats: ${importFormats
      .map((format) => format.label)
      .join(", ")}.`,
  };
}
