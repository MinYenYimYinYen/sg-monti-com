import type { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";

/** One candidate upsell in the waterfall. */
export type UpsellPriorityDoc = {
  progCodeId: string;
  /** progCodeIds that, if the customer has any of them, rule this upsell out. */
  precludedBy: string[];
};

/** Hydrated for the UI. Null when the progCode no longer exists. */
export type UpsellPriority = UpsellPriorityDoc & {
  progCode: ProgCode | null;
  precludedByProgCodes: ProgCode[];
};

/**
 * A named, ordered list of upsell candidates, e.g. "2027 Renewals".
 * Natural key: `name + saId`. `upsellPrioritiesId` is a slug derived from them
 * server-side and never changes.
 *
 * Order matters: the first candidate the customer is not precluded from wins.
 */
export type UpsellPrioritiesDoc = CreatedUpdated & {
  upsellPrioritiesId: string;
  name: string;
  saId: string;
  priorities: UpsellPriorityDoc[];
};

/** Draft shape: timestamps only exist once saved. */
export type UpsellPrioritiesDraft = Omit<UpsellPrioritiesDoc, keyof CreatedUpdated> &
  Partial<CreatedUpdated>;
