import { createHash } from "crypto";
import { ImportCsvRow } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";

type HashableRow = Pick<
  ImportCsvRow,
  "formatId" | "last4" | "transactionDate" | "postedDate" | "description" | "amountCents" | "kind"
>;

const FIELD_SEPARATOR = "\u001f";

/**
 * Identity of a CSV row. Neither bank provides a transaction ID, so this is a hash of the
 * minimal columns, scoped by formatId. Server-side only (Node crypto, synchronous).
 * Changing the fields or their order changes every hash and breaks duplicate detection
 * against stored rows.
 */
export function computeRowHash(row: HashableRow): string {
  const fields = [
    row.formatId,
    row.last4,
    row.transactionDate,
    row.postedDate,
    row.description,
    String(row.amountCents),
    row.kind,
  ];
  return createHash("sha256").update(fields.join(FIELD_SEPARATOR)).digest("hex");
}
