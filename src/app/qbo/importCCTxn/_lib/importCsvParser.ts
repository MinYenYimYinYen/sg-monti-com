import Papa from "papaparse";
import {
  ImportCsvRow,
  ImportParseResult,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";
import { detectImportFormat } from "@/app/qbo/importCCTxn/_lib/importFormatRegistry";

/**
 * Parses a bank CSV. All-or-nothing: any bad row fails the whole file, and every problem is
 * returned with its line number so the user can fix the file or report the new shape to us.
 */
export function parseImportCsvText(text: string): ImportParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const headers = parsed.meta.fields ?? [];
  if (headers.length === 0) {
    return { success: false, errors: ["The file has no header row."] };
  }

  const detection = detectImportFormat(headers);
  if (!detection.success) {
    return { success: false, errors: [detection.error] };
  }

  const errors: string[] = parsed.errors.map((error) =>
    error.row === undefined
      ? `Parse error: ${error.message}`
      : `Row ${error.row + 2}: ${error.message}`,
  );

  const rows: ImportCsvRow[] = [];
  parsed.data.forEach((csvRow, index) => {
    const rowNumber = index + 2;
    const result = detection.format.parseRow(csvRow);
    if (!result.success) {
      result.errors.forEach((message) => errors.push(`Row ${rowNumber}: ${message}`));
      return;
    }
    rows.push({ ...result.data, formatId: detection.format.id, rowNumber });
  });

  if (errors.length > 0) return { success: false, errors };
  if (rows.length === 0) return { success: false, errors: ["The file has no transaction rows."] };

  return {
    success: true,
    formatId: detection.format.id,
    formatLabel: detection.format.label,
    rows,
  };
}

export async function parseImportCsvFile(file: File): Promise<ImportParseResult> {
  let text: string;
  try {
    text = await file.text();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    return { success: false, errors: [`Could not read the file: ${reason}`] };
  }
  return parseImportCsvText(text);
}
