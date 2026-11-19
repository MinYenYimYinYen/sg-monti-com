import { createHash } from "crypto";

// Server side only (Node crypto, synchronous). A sales tax payment is identified by its month, so
// the hash is of the period end alone. Changing the fields changes every hash.

const FIELD_SEPARATOR = "\u001f";

export function computeSalesTaxPeriodHash(periodEnd: string): string {
  return createHash("sha256").update(["salesTax", periodEnd].join(FIELD_SEPARATOR)).digest("hex");
}
