import { DepositField } from "@/app/javelin/JavelinTypes";

// Natural side for each field when the value is positive. A negative value flips the side.
export const FIELD_NATURAL_SIDE: Record<DepositField, "debit" | "credit"> = {
  salesAmount: "credit",
  refundAmount: "debit",
  chargeBackAmount: "debit",
  adjustmentAmount: "debit",
  fees: "debit",
  netDeposit: "debit",
};

export const DEPOSIT_FIELDS: DepositField[] = [
  "salesAmount",
  "refundAmount",
  "chargeBackAmount",
  "adjustmentAmount",
  "fees",
  "netDeposit",
];

export const DEPOSIT_FIELD_LABELS: Record<DepositField, string> = {
  salesAmount: "Sales",
  refundAmount: "Refunds",
  chargeBackAmount: "Chargebacks",
  adjustmentAmount: "Adjustments",
  fees: "Fees",
  netDeposit: "Net deposit",
};

// Lines that share a QBO account (Sales and Refund both hit Credit Card Payments) need a label.
export const DEPOSIT_FIELD_DESCRIPTIONS: Partial<Record<DepositField, string>> = {
  refundAmount: "Refund",
  chargeBackAmount: "Chargeback",
  adjustmentAmount: "Adjustment",
};

export function effectiveSide({
  field,
  cents,
}: {
  field: DepositField;
  cents: number;
}): "debit" | "credit" {
  const natural = FIELD_NATURAL_SIDE[field];
  if (cents > 0) return natural;
  return natural === "debit" ? "credit" : "debit";
}
