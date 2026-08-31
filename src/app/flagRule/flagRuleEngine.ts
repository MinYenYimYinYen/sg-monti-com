import { FlagRule } from "@/app/flagRule/FlagRuleTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Flag } from "@/app/realGreen/flag/FlagTypes";

export type FlagRuleStatus = "valid" | "missing" | "conflict";

export type FlagRuleResult = {
  rule: FlagRule;
  status: FlagRuleStatus;
  /** The hydrated Flag objects from the rule's flagIds that are present on the customer. */
  presentFlags: Flag[];
  message: string;
};

function getFlagName(flagId: number, flagMap: Map<number, Flag>): string {
  return flagMap.get(flagId)?.desc ?? String(flagId);
}

function buildFlagNameList(flagIds: number[], flagMap: Map<number, Flag>): string {
  return flagIds.map((id) => getFlagName(id, flagMap)).join(", ");
}

/**
 * Evaluates a single FlagRule against a customer.
 *
 * @param customer - The fully hydrated Customer to evaluate.
 * @param rule - The FlagRule to check.
 * @param flagMap - A map of flagId → Flag for resolving human-readable names.
 *   Should include all flags referenced by the rule (not just those on the customer).
 *   Falls back to flagId.toString() for any flag not in the map.
 */
export function evaluateFlagRule(
  customer: Customer,
  rule: FlagRule,
  flagMap: Map<number, Flag>,
): FlagRuleResult {
  const customerFlagIds = new Set(customer.flags.map((f) => f.flagId));
  const presentFlags = rule.flagIds
    .filter((id) => customerFlagIds.has(id))
    .map((id) => flagMap.get(id) ?? customer.flags.find((f) => f.flagId === id)!)
    .filter(Boolean);

  const count = presentFlags.length;

  if (rule.kind === "XOR") {
    if (count === 0) {
      return {
        rule,
        status: "missing",
        presentFlags: [],
        message: `Customer needs exactly one of: ${buildFlagNameList(rule.flagIds, flagMap)}`,
      };
    }
    if (count === 1) {
      return { rule, status: "valid", presentFlags, message: "" };
    }
    // count >= 2
    return {
      rule,
      status: "conflict",
      presentFlags,
      message: `Customer should not have more than one of: ${buildFlagNameList(rule.flagIds, flagMap)} (has: ${presentFlags.map((f) => f.desc).join(", ")})`,
    };
  }

  // NAND
  if (count <= 1) {
    return { rule, status: "valid", presentFlags, message: "" };
  }
  return {
    rule,
    status: "conflict",
    presentFlags,
    message: `Customer should not have more than one of: ${buildFlagNameList(rule.flagIds, flagMap)} (has: ${presentFlags.map((f) => f.desc).join(", ")})`,
  };
}

/**
 * Evaluates all FlagRules against a customer and returns results for every rule.
 */
export function evaluateAllRules(
  customer: Customer,
  rules: FlagRule[],
  flagMap: Map<number, Flag>,
): FlagRuleResult[] {
  return rules.map((rule) => evaluateFlagRule(customer, rule, flagMap));
}
