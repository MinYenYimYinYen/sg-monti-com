/**
 * Billing type codes from the RealGreen CRM API.
 * New codes may appear in future data — unknown values pass through as plain strings.
 */
export type BillingType = "R" | "A" | "C" | (string & {});

/** Maps semantic names to their RealGreen billing type codes. */
export const BILLING_TYPE = {
  /** Standard invoice sent to the customer after service. */
  RegularInvoice: "R",
  /** Card on file is charged automatically after each service. */
  AutoCreditCard: "A",
  /** Program price is split into scheduled installment payments. */
  Installment: "C",
} as const;

/** Returns true if the value is a recognized billing type code. */
export function isKnownBillingType(value: string): value is "R" | "A" | "C" {
  return value === "R" || value === "A" || value === "C";
}
