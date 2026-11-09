import { createHash } from "crypto";
import { DepositField } from "@/app/javelin/JavelinTypes";
import { DEPOSIT_FIELDS } from "@/app/javelin/_lib/depositFields";

// Server side only (Node crypto, synchronous). The identity of a Javelin entry is a hash of the
// CRM source data, never of the QBO lines, so remapping an account cannot change it. Changing
// the fields or their order changes every hash and breaks duplicate detection against stored
// postings.

const FIELD_SEPARATOR = "\u001f";

export type GenLedgerHashLine = { crmAccount: string; netCents: number };

/** One day's ledger. Lines are sorted so the order of rows in the file does not matter. */
export function computeGenLedgerHash({
  date,
  lines,
}: {
  date: string;
  lines: GenLedgerHashLine[];
}): string {
  const sorted = [...lines].sort(
    (a, b) => a.crmAccount.localeCompare(b.crmAccount) || a.netCents - b.netCents,
  );
  const fields = [
    "genLedger",
    date,
    ...sorted.map((line) => `${line.crmAccount}=${line.netCents}`),
  ];
  return createHash("sha256").update(fields.join(FIELD_SEPARATOR)).digest("hex");
}

/** One WorkWave deposit row. Identical rows on one date share a hash; occurrence tells them apart. */
export function computeDepositHash({
  date,
  fieldCents,
}: {
  date: string;
  fieldCents: Record<DepositField, number>;
}): string {
  const fields = [
    "deposit",
    date,
    ...DEPOSIT_FIELDS.map((field) => `${field}=${fieldCents[field]}`),
  ];
  return createHash("sha256").update(fields.join(FIELD_SEPARATOR)).digest("hex");
}
