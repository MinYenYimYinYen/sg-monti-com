// Generic batch waterfall. No React, no store, no domain knowledge: the renewal-specific
// rules live in renewalBatchLevels.ts.
//
// A level is an ordered list of rules. Each rule claims the customers it matches from
// whatever the previous rules left over, so a customer can land in at most one batch per
// level. Each claimed group then descends into the next level, which is what guarantees a
// customer can never end up in two batches (and never gets duplicate letter data).

export type BatchRule<TCustomer> = {
  ruleKey: string;
  label: string;
  claims: (customer: TCustomer) => boolean;
  /** Claimed customers are dropped from batching and reported under `ignored` instead. */
  ignore?: boolean;
  /**
   * Claimed customers become a finished batch at this level and skip every level below it.
   * Used when the lower levels would split a group that has to stay together.
   */
  final?: boolean;
  /**
   * Orders the customers this rule claims. Omit it to keep the incoming order. The sort is
   * stable and every later split keeps order, so the result holds through the lower levels.
   */
  sort?: (a: TCustomer, b: TCustomer) => number;
};

export type WaterfallLevel<TCustomer> = {
  levelName: string;
  rules: BatchRule<TCustomer>[];
};

/** One rule a batch passed through, in level order. */
export type BatchStep = {
  levelName: string;
  ruleKey: string;
  label: string;
};

export type Batch<TCustomer> = {
  /** Rule keys joined in level order, e.g. `autoRenew/normal/UPSELL1`. Unique per batch. */
  batchKey: string;
  steps: BatchStep[];
  customers: TCustomer[];
};

/** Customers no rule at a level claimed. A non-empty group means the rules have a gap. */
export type UnclaimedGroup<TCustomer> = {
  levelName: string;
  /** The steps the group had already passed through when the level failed to claim it. */
  steps: BatchStep[];
  customers: TCustomer[];
};

export type BatchResult<TCustomer> = {
  batches: Batch<TCustomer>[];
  ignored: Batch<TCustomer>[];
  unclaimed: UnclaimedGroup<TCustomer>[];
};

type RunWaterfallParams<TCustomer> = {
  customers: TCustomer[];
  rules: BatchRule<TCustomer>[];
};

/** Runs one level. Empty rules are omitted from `claimed`. */
export function runWaterfall<TCustomer>({ customers, rules }: RunWaterfallParams<TCustomer>) {
  const claimed: { rule: BatchRule<TCustomer>; customers: TCustomer[] }[] = [];
  let remaining = customers;

  for (const rule of rules) {
    const matched: TCustomer[] = [];
    const rest: TCustomer[] = [];
    for (const customer of remaining) {
      (rule.claims(customer) ? matched : rest).push(customer);
    }
    if (rule.sort) matched.sort(rule.sort);
    if (matched.length > 0) claimed.push({ rule, customers: matched });
    remaining = rest;
  }

  return { claimed, unclaimed: remaining };
}

type BuildBatchesParams<TCustomer> = {
  customers: TCustomer[];
  levels: WaterfallLevel<TCustomer>[];
};

/** Runs every level, each claimed group feeding the next level. Empty batches never appear. */
export function buildBatches<TCustomer>({
  customers,
  levels,
}: BuildBatchesParams<TCustomer>): BatchResult<TCustomer> {
  const result: BatchResult<TCustomer> = { batches: [], ignored: [], unclaimed: [] };
  descend({ steps: [], customers, levels, levelIndex: 0, result });
  return result;
}

type DescendParams<TCustomer> = {
  steps: BatchStep[];
  customers: TCustomer[];
  levels: WaterfallLevel<TCustomer>[];
  levelIndex: number;
  result: BatchResult<TCustomer>;
};

function toBatch<TCustomer>({
  steps,
  customers,
}: {
  steps: BatchStep[];
  customers: TCustomer[];
}): Batch<TCustomer> {
  return { batchKey: steps.map((step) => step.ruleKey).join("/"), steps, customers };
}

function descend<TCustomer>({
  steps,
  customers,
  levels,
  levelIndex,
  result,
}: DescendParams<TCustomer>) {
  const level = levels[levelIndex];
  if (!level) {
    result.batches.push(toBatch({ steps, customers }));
    return;
  }

  const { claimed, unclaimed } = runWaterfall({ customers, rules: level.rules });

  for (const { rule, customers: claimedCustomers } of claimed) {
    const nextSteps = [
      ...steps,
      { levelName: level.levelName, ruleKey: rule.ruleKey, label: rule.label },
    ];
    if (rule.ignore) {
      result.ignored.push(toBatch({ steps: nextSteps, customers: claimedCustomers }));
      continue;
    }
    if (rule.final) {
      result.batches.push(toBatch({ steps: nextSteps, customers: claimedCustomers }));
      continue;
    }
    descend({
      steps: nextSteps,
      customers: claimedCustomers,
      levels,
      levelIndex: levelIndex + 1,
      result,
    });
  }

  if (unclaimed.length > 0) {
    result.unclaimed.push({ levelName: level.levelName, steps, customers: unclaimed });
  }
}

/** The rule key a batch passed through at the named level, or undefined. */
export function getStepRuleKey({
  steps,
  levelName,
}: {
  steps: BatchStep[];
  levelName: string;
}): string | undefined {
  return steps.find((step) => step.levelName === levelName)?.ruleKey;
}

/** The label of the rule a batch passed through at the named level, or undefined. */
export function getStepLabel({
  steps,
  levelName,
}: {
  steps: BatchStep[];
  levelName: string;
}): string | undefined {
  return steps.find((step) => step.levelName === levelName)?.label;
}
