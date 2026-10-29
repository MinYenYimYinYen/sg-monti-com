import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { Company } from "@/app/realGreen/company/_lib/CompanyTypes";
import type { PrepayConfig } from "@/app/prepayLetters/config/prepayConfigTypes";
import type { PrepayLetterData } from "@/app/prepayLetters/template/PrepayLetterTypes";
import type { UpsellPriority } from "@/app/prepayLetters/upsellPriorities/upsellPrioritiesTypes";
import { chooseUpsell } from "@/app/prepayLetters/upsellPriorities/upsellPrioritiesLogic";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { buildBatches, getStepLabel, getStepRuleKey, type Batch } from "./renewalBatches";
import {
  BILLING_RULE_KEYS,
  LEVEL_NAMES,
  NO_UPSELL_RULE_KEY,
  RENEWAL_RULE_KEYS,
  buildRenewalLevels,
  getBillingGroupKey,
  getCustomerProgCodeIds,
} from "./renewalBatchLevels";

const UNCLAIMED_SAMPLE_SIZE = 10;

export type RenewalBatchSummary = {
  batchKey: string;
  /** `renewalKey/billingKey`. Batches sharing it differ only by upsell, so they can be combined. */
  parentKey: string;
  renewalKey: string;
  billingKey: string;
  billingLabel: string;
  /** Null for a batch that ends before the upsell level (Group Bill). */
  upsellKey: string | null;
  upsellLabel: string;
  customerCount: number;
  /** Distinct billing groups, for Group Bill batches only. */
  groupCount: number | null;
  /** One per customer, ready for the form renderer. Never shown in the list. */
  letters: PrepayLetterData[];
};

/** Customers the rules did not place anywhere. Anything here is a gap in the rules. */
export type MissedCustomers = {
  levelName: string;
  /** Where the customers were when the level failed to claim them, e.g. "Auto Renew / Normal". */
  pathLabel: string;
  customerCount: number;
  sampleCustIds: number[];
};

export type RenewalBatchesResult = {
  batches: RenewalBatchSummary[];
  missed: MissedCustomers[];
  /** Customers carrying the confirmed renewal flag. Counted and set aside, never batched. */
  confirmedCount: number;
  totalCustomers: number;
};

type BuildRenewalBatchesParams = {
  customers: Customer[];
  priorities: UpsellPriority[];
  config: PrepayConfig;
  company: Company;
};

/** Copy, never in place: the input is a memoized selector result. */
export function sortCustomersByCustId(customers: Customer[]): Customer[] {
  return [...customers].sort((a, b) => a.custId - b.custId);
}

function pathLabelOf(steps: { label: string }[]): string {
  return steps.length === 0 ? "All customers" : steps.map((step) => step.label).join(" / ");
}

export function buildRenewalBatches({
  customers,
  priorities,
  config,
  company,
}: BuildRenewalBatchesParams): RenewalBatchesResult {
  const levels = buildRenewalLevels({ priorities });
  const { batches, ignored, unclaimed } = buildBatches({ customers, levels });

  const progCodeById = new Map<string, ProgCode>();
  for (const priority of priorities) {
    if (priority.progCode) progCodeById.set(priority.progCodeId, priority.progCode);
  }

  const toSummary = (batch: Batch<Customer>): RenewalBatchSummary => {
    const renewalKey = getStepRuleKey({ steps: batch.steps, levelName: LEVEL_NAMES.renewal }) ?? "";
    const billingKey = getStepRuleKey({ steps: batch.steps, levelName: LEVEL_NAMES.billing }) ?? "";
    const upsellKey = getStepRuleKey({ steps: batch.steps, levelName: LEVEL_NAMES.upsell }) ?? null;
    const isAutoRenew = renewalKey === RENEWAL_RULE_KEYS.autoRenew;
    const isGroupBill = billingKey === BILLING_RULE_KEYS.groupBill;

    // A Group Bill batch never splits by upsell, so it has no upsell key: each customer's
    // letter carries their own upsell, and one batch can hold letters with different ones.
    // A priority whose progCode no longer exists has no ProgCode to price, so it prints as no upsell.
    const upsellFor = (customer: Customer): ProgCode | null => {
      const upsellId = isGroupBill
        ? chooseUpsell({ priorities, customerProgCodeIds: getCustomerProgCodeIds(customer) })
        : upsellKey;
      if (!upsellId || upsellId === NO_UPSELL_RULE_KEY) return null;
      return progCodeById.get(upsellId) ?? null;
    };

    return {
      batchKey: batch.batchKey,
      parentKey: `${renewalKey}/${billingKey}`,
      renewalKey,
      billingKey,
      billingLabel: getStepLabel({ steps: batch.steps, levelName: LEVEL_NAMES.billing }) ?? "",
      upsellKey,
      upsellLabel: getStepLabel({ steps: batch.steps, levelName: LEVEL_NAMES.upsell }) ?? "",
      customerCount: batch.customers.length,
      groupCount: isGroupBill
        ? new Set(batch.customers.map(getBillingGroupKey)).size
        : null,
      letters: batch.customers.map((customer) => ({
        company,
        customer,
        config,
        isAutoRenew,
        upsell: upsellFor(customer),
      })),
    };
  };

  return {
    batches: batches.map(toSummary),
    missed: unclaimed.map((group) => ({
      levelName: group.levelName,
      pathLabel: pathLabelOf(group.steps),
      customerCount: group.customers.length,
      sampleCustIds: group.customers.slice(0, UNCLAIMED_SAMPLE_SIZE).map((c) => c.custId),
    })),
    confirmedCount: ignored
      .filter(
        (batch) =>
          getStepRuleKey({ steps: batch.steps, levelName: LEVEL_NAMES.renewal }) ===
          RENEWAL_RULE_KEYS.confirmed,
      )
      .reduce((sum, batch) => sum + batch.customers.length, 0),
    totalCustomers: customers.length,
  };
}
