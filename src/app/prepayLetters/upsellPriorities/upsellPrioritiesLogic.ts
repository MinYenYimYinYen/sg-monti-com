import type { UpsellPriorityDoc } from "./upsellPrioritiesTypes";

type ChooseUpsellParams = {
  priorities: UpsellPriorityDoc[];
  customerProgCodeIds: string[];
};

/**
 * Waterfall: returns the progCodeId of the first priority the customer neither already
 * has nor is precluded from, or null when every candidate is ruled out.
 */
export function chooseUpsell({ priorities, customerProgCodeIds }: ChooseUpsellParams): string | null {
  const owned = new Set(customerProgCodeIds);
  for (const priority of priorities) {
    if (owned.has(priority.progCodeId)) continue;
    if (priority.precludedBy.some((id) => owned.has(id))) continue;
    return priority.progCodeId;
  }
  return null;
}
