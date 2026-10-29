import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { chooseUpsell } from "@/app/prepayLetters/upsellPriorities/upsellPrioritiesLogic";
import type { UpsellPriority } from "@/app/prepayLetters/upsellPriorities/upsellPrioritiesTypes";
import type { BatchRule, WaterfallLevel } from "./renewalBatches";

// The renewal letter waterfall: renewal flag -> billing -> upsell.
// Rule order inside a level IS the precedence, because earlier rules claim first.

export const LEVEL_NAMES = {
  renewal: "renewal",
  billing: "billing",
  upsell: "upsell",
} as const;

export const RENEWAL_RULE_KEYS = {
  confirmed: "confirmed",
  dontAutoRenew: "dontAutoRenew",
  autoRenew: "autoRenew",
} as const;

export const BILLING_RULE_KEYS = {
  groupBill: "groupBill",
  billTo: "billTo",
  normal: "normal",
} as const;

/** Rule key of the upsell batch for customers with no available upsell. */
export const NO_UPSELL_RULE_KEY = "__noUpsell__";

export function getCustomerProgCodeIds(customer: Customer): string[] {
  return customer.programs.map((program) => program.progCode.progCodeId);
}

// Level 1: renewal flags. A customer with no renewal flag is left unclaimed on purpose, so
// it surfaces as "missed" instead of silently getting a letter.
//
// dontAutoRenew sits before autoRenew so a customer carrying both flags gets the safer
// letter. Swap the order here to change that.
const renewalRules: BatchRule<Customer>[] = [
  {
    ruleKey: RENEWAL_RULE_KEYS.confirmed,
    label: "Confirmed",
    claims: (customer) => customer.x.isConfirmed,
    ignore: true,
  },
  {
    ruleKey: RENEWAL_RULE_KEYS.dontAutoRenew,
    label: "Don't Auto Renew",
    claims: (customer) => customer.x.isDontAutoRenew,
  },
  {
    ruleKey: RENEWAL_RULE_KEYS.autoRenew,
    label: "Auto Renew",
    claims: (customer) => customer.x.isAutoRenew,
  },
];

/** A master account is its own group; a member belongs to its master's group. */
export function getBillingGroupKey(customer: Customer): number {
  return customer.isMasterAcct ? customer.custId : customer.masterAcctId;
}

/**
 * Keeps each group's letters together in the pile, master first. Ties fall back to the
 * incoming order (custId, from the first selector) because the sort is stable.
 */
export function compareByBillingGroup(a: Customer, b: Customer): number {
  const groupDifference = getBillingGroupKey(a) - getBillingGroupKey(b);
  if (groupDifference !== 0) return groupDifference;
  return Number(b.isMasterAcct) - Number(a.isMasterAcct);
}

// Level 2: billing. Order is precedence: a group member who also has their own billing
// address is Group Bill. "normal" takes everyone who reaches the end.
// Customers arrive sorted by custId, so only Group Bill needs its own sort.
//
// Group Bill is final: a billing group must never be split across upsell batches, so it
// skips the upsell level and stays one batch. Each customer's letter still carries their own
// upsell (chosen in renewalLettersLogic.ts), so one Group Bill batch can mix upsells.
const billingRules: BatchRule<Customer>[] = [
  {
    ruleKey: BILLING_RULE_KEYS.groupBill,
    label: "Group Bill",
    claims: (customer: Customer) => customer.isBilledWithMasterAcct || customer.isMasterAcct,
    sort: compareByBillingGroup,
    final: true,
  },
  { ruleKey: BILLING_RULE_KEYS.billTo, label: "Bill To", claims: (customer: Customer) => customer.useBilling },
  { ruleKey: BILLING_RULE_KEYS.normal, label: "Normal", claims: () => true },
];

/**
 * Level 3: one rule per upsell candidate, plus a "no upsell" rule. `chooseUpsell` already
 * picks exactly one candidate per customer, so these rules never compete with each other.
 * The no-upsell rule claims only a null choice (not everyone left), so a customer the
 * upsell rules somehow miss still shows up as unclaimed.
 */
function buildUpsellRules(priorities: UpsellPriority[]): BatchRule<Customer>[] {
  const chooseFor = (customer: Customer) =>
    chooseUpsell({ priorities, customerProgCodeIds: getCustomerProgCodeIds(customer) });

  const upsellRules = priorities.map(
    (priority): BatchRule<Customer> => ({
      ruleKey: priority.progCodeId,
      label: priority.progCode?.description ?? priority.progCodeId,
      claims: (customer) => chooseFor(customer) === priority.progCodeId,
    }),
  );

  return [
    ...upsellRules,
    {
      ruleKey: NO_UPSELL_RULE_KEY,
      label: "No Upsell",
      claims: (customer) => chooseFor(customer) === null,
    },
  ];
}

export function buildRenewalLevels({
  priorities,
}: {
  priorities: UpsellPriority[];
}): WaterfallLevel<Customer>[] {
  return [
    { levelName: LEVEL_NAMES.renewal, rules: renewalRules },
    { levelName: LEVEL_NAMES.billing, rules: billingRules },
    { levelName: LEVEL_NAMES.upsell, rules: buildUpsellRules(priorities) },
  ];
}
