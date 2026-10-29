import type { DisplayBatch } from "./renewalBatchCombining";
import {
  BILLING_RULE_KEYS,
  NO_UPSELL_RULE_KEY,
  RENEWAL_RULE_KEYS,
} from "./renewalBatchLevels";

// Pure helpers for saving batch PDFs. No React, no store, no browser APIs.

const MAX_SEGMENT_LENGTH = 60;

const RENEWAL_CODES: Record<string, string> = {
  [RENEWAL_RULE_KEYS.autoRenew]: "AR",
  [RENEWAL_RULE_KEYS.dontAutoRenew]: "DNAR",
};

const BILLING_CODES: Record<string, string> = {
  [BILLING_RULE_KEYS.groupBill]: "group",
  [BILLING_RULE_KEYS.billTo]: "billTo",
  [BILLING_RULE_KEYS.normal]: "servAddr",
};

/** Keeps a segment free of spaces, which separate segments, and of characters Windows rejects. */
function sanitizeSegment(text: string): string {
  const cleaned = text
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SEGMENT_LENGTH);
  return cleaned === "" ? "x" : cleaned;
}

/**
 * Group Bill rows have no upsell key because each letter carries its own, so the slot says
 * MIXED. A row whose only upsell is the no-upsell key says NONE.
 */
function buildUpsellSegment(row: DisplayBatch): string {
  if (row.upsellKeys.length === 0) return "MIXED";
  const names = row.upsellKeys.map((key) =>
    key === NO_UPSELL_RULE_KEY ? "NONE" : sanitizeSegment(key),
  );
  return names.join("-");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local time, `yyyyMMdd-HHmmss`. No colons: Windows file names cannot contain them. */
export function formatFileTimestamp(date: Date): string {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${day}-${time}`;
}

type BuildBaseNameParams = { season: number; row: DisplayBatch; timestamp: string };

/** e.g. `2027 rnwl AR servAddr AERATION-GRUB 20261029-143205`. Unknown keys print as they are. */
function buildBaseName({ season, row, timestamp }: BuildBaseNameParams): string {
  return [
    String(season),
    "rnwl",
    RENEWAL_CODES[row.renewalKey] ?? sanitizeSegment(row.renewalKey),
    BILLING_CODES[row.billingKey] ?? sanitizeSegment(row.billingKey),
    buildUpsellSegment(row),
    timestamp,
  ].join(" ");
}

/**
 * One file name per row, in row order. The timestamp makes each run's names new, so saving
 * again never overwrites an earlier run. Within one run two rows can still produce the same
 * name, so repeats get a numeric suffix.
 */
export function buildPdfFileNames({
  season,
  rows,
  timestamp,
}: {
  season: number;
  rows: DisplayBatch[];
  /** Created once per run by the caller, so every file from one click shares it. */
  timestamp: Date;
}): string[] {
  const stamp = formatFileTimestamp(timestamp);
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const baseName = buildBaseName({ season, row, timestamp: stamp });
    const count = (seen.get(baseName) ?? 0) + 1;
    seen.set(baseName, count);
    return count === 1 ? `${baseName}.pdf` : `${baseName} (${count}).pdf`;
  });
}

/** Folder saving needs the File System Access API (Chromium, secure context). */
export function canPickFolder(target: object): boolean {
  // Takes `object`, not a type with an optional property: TypeScript rejects `window` for a
  // type whose properties are all optional when the DOM lib does not declare them.
  return "showDirectoryPicker" in target && typeof target.showDirectoryPicker === "function";
}
