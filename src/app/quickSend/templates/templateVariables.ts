import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

/**
 * Allowlist of Customer properties that can be referenced in template bodies.
 * TypeScript enforces that every key here exists on Customer — if Customer
 * renames a property, this file will produce a compile error immediately.
 *
 * Variables are inserted as {{customer.<key>}} placeholders and resolved at
 * send time via `String(customer[key])`.
 */
export type CustomerVariableKey = keyof Pick<
  Customer,
  "displayName" | "email" | "size"
>;

/** Human-readable labels shown in the @ mention suggestion menu. */
export const CUSTOMER_VARIABLES: Record<CustomerVariableKey, string> = {
  displayName: "Customer Name",
  email: "Email",
  size: "Size",
};
