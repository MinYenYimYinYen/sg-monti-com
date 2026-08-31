import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

type FlagRuleBase = CreatedUpdated & {
  flagRuleId: string;
  /** Human-readable name for this rule, e.g. "Prepay Exclusivity" */
  label: string;
  /** The flag IDs this rule governs. Must contain at least 2. */
  flagIds: number[];
};

/**
 * XOR rule — exactly one of the flagIds must be present on the customer.
 * - 0 present → advisory: customer needs one of them
 * - 1 present → valid
 * - 2+ present → advisory: customer has conflicting flags
 */
type XorFlagRule = FlagRuleBase & {
  kind: "XOR";
};

/**
 * NAND rule — at most one of the flagIds may be present on the customer.
 * - 0 present → valid
 * - 1 present → valid
 * - 2+ present → advisory: customer has conflicting flags
 */
type NandFlagRule = FlagRuleBase & {
  kind: "NAND";
};

export type FlagRule = XorFlagRule | NandFlagRule;
export type FlagRuleKind = FlagRule["kind"];

export const FLAG_RULE_KINDS: FlagRuleKind[] = ["XOR", "NAND"];

export const FLAG_RULE_KIND_DESCRIPTIONS: Record<FlagRuleKind, string> = {
  XOR: "Exactly one flag must be present (exclusive choice)",
  NAND: "At most one flag may be present (mutually exclusive, optional)",
};
