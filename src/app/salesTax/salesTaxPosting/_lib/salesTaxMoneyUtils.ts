// Pure money helpers for the sales tax payment, safe for the browser and the server (no imports).
// The payable account is a liability, so its balance is credit positive: a credit balance of
// 100.00 is +10000. All money is whole cents.

/**
 * What must be added to the payable account's credit balance on the period end so it equals the
 * payment: positive credits the payable account, negative debits it, zero means no entry.
 */
export function computeAdjustmentCents({
  paymentCents,
  balanceCents,
}: {
  paymentCents: number;
  balanceCents: number;
}): number {
  return paymentCents - balanceCents;
}

export function exceedsAdjustmentWarning({
  adjustmentCents,
  warnCents,
}: {
  adjustmentCents: number;
  warnCents: number;
}): boolean {
  return Math.abs(adjustmentCents) > warnCents;
}

/** A dollars figure for a message or a screen, from whole cents. */
export function describeCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const dollars = Math.floor(absolute / 100).toLocaleString("en-US");
  return `${sign}$${dollars}.${String(absolute % 100).padStart(2, "0")}`;
}
