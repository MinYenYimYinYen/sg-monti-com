import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { flagRuleSelect } from "@/app/flagRule/flagRuleSelect";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { evaluateAllRules, FlagRuleResult, FlagRuleStatus } from "@/app/flagRule/flagRuleEngine";
import { FlagRule } from "@/app/flagRule/FlagRuleTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

export type ViolationGroup = {
  /** The human-readable violation message — used as the accordion header. */
  message: string;
  status: FlagRuleStatus;
  rule: FlagRule;
  /** All customers that produced this exact violation message. */
  customers: Customer[];
};

/**
 * Runs all FlagRules against every active customer and groups violations by message.
 *
 * Uses the full flagDocMap so that "missing" messages correctly name all candidate flags,
 * not just the ones the customer happens to have.
 *
 * Sorted by customer count descending (most-impacted violations first).
 */
const selectViolationGroups = createSelector(
  [centralSelect.customers, flagRuleSelect.all, flagSelect.flagDocMap],
  (customers, rules, flagDocMap): ViolationGroup[] => {
    if (rules.length === 0 || customers.length === 0) return [];

    // Collect all violations across all customers
    const groupMap = new Map<string, ViolationGroup>();

    for (const customer of customers) {
      const results: FlagRuleResult[] = evaluateAllRules(customer, rules, flagDocMap);
      for (const result of results) {
        if (result.status === "valid") continue;

        const existing = groupMap.get(result.message);
        if (existing) {
          existing.customers.push(customer);
        } else {
          groupMap.set(result.message, {
            message: result.message,
            status: result.status,
            rule: result.rule,
            customers: [customer],
          });
        }
      }
    }

    // Sort by customer count descending
    return Array.from(groupMap.values()).sort(
      (a, b) => b.customers.length - a.customers.length,
    );
  },
);

export const sanityFlagRuleSelect = {
  violationGroups: selectViolationGroups,
};
