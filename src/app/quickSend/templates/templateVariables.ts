/**
 * Curated allowlist of Customer properties that can be referenced in template bodies.
 * Variables are inserted as {{customer.<key>}} placeholders and resolved at send time.
 */
export type CustomerVariableKey = "displayName" | "size" | "email";

export const CUSTOMER_VARIABLES: Record<CustomerVariableKey, string> = {
  displayName: "Customer Name",
  size: "Lawn Size (sq ft)",
  email: "Email",
};
