import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

const ACTIVE_STATUSES = new Set(getServiceStatuses(["active", "asap"]));

// ---------------------------------------------------------------------------
// CrawlService — minimal mutable service representation for the future crawl
// ---------------------------------------------------------------------------

/**
 * A lightweight copy of a service used during the future crawl.
 *
 * Copied from the immutable `Service` objects before the crawl starts so the
 * crawl can mutate `doneDate` without touching Redux state.
 *
 * `doneDate` starts as the real completion date for already-completed services,
 * or null for active services that will be projected during the crawl.
 */
export type CrawlService = {
  servId: number;
  progId: number;
  price: number;
  /** Set when the service is completed — either historically or projected by the crawl. */
  doneDate: string | null;
};

// ---------------------------------------------------------------------------
// ConstrainedGroupQueue — per-group mutable state for constrained sequences
// ---------------------------------------------------------------------------

/**
 * Mutable service queue for one group in a constrained sequence.
 *
 * `available` — services whose predecessor doneDate + daysSince <= today.
 *   Sorted price descending. Consumed (spliced out) as employees work them.
 *
 * `pending` — services waiting for their predecessor to be completed.
 *   Moved to `available` as predecessor doneDates are set during the crawl.
 */
export type ConstrainedGroupQueue = {
  /** Services ready to work today. Sorted price descending. Mutated during crawl. */
  available: CrawlService[];
  /** Services blocked by daysSince constraint. Moved to available as predecessors complete. */
  pending: CrawlService[];
  /**
   * Services that have been consumed (completed) by the crawl.
   * Each consumed service has `doneDate` set to the day it was worked.
   * Successor groups search this list to find predecessor doneDates for pending promotion.
   */
  completed: CrawlService[];
};

// ---------------------------------------------------------------------------
// buildCrawlServiceQueues
// ---------------------------------------------------------------------------

/**
 * Builds mutable service queues for every group in every constrained sequence.
 *
 * For sequences with `daysSince` set, each group (including the first) gets a
 * `CrawlService[]` queue. The first group's queue is always fully available
 * (no constraint on it). Successor groups start with services partitioned into
 * `available` (predecessor already done long enough ago) and `pending` (not yet).
 *
 * For sequences without `daysSince`, returns an empty map — those groups use
 * the existing `drainGroupPool` aggregate approach.
 *
 * @param servCodes - All servCodes with their services (from PaceEngineInputs).
 * @param sequences - Normalized sequences (including synthetic single-member ones).
 * @param servCodeToGroupId - Map<servCodeId, groupId> built during past phase.
 * @param groupServCodeIds - Map<groupId, string[]> of servCodeIds per group.
 * @param mainDate - The "as of" date — services completed on or before this are historical.
 * @returns Map<groupId, ConstrainedGroupQueue> for groups in constrained sequences.
 */
export function buildCrawlServiceQueues({
  servCodes,
  sequences,
  servCodeToGroupId,
  groupServCodeIds,
  mainDate,
}: {
  servCodes: ServCodeDeep[];
  sequences: GroupSequence[];
  servCodeToGroupId: Map<string, string>;
  groupServCodeIds: Map<string, Set<string>>;
  mainDate: string;
}): Map<string, ConstrainedGroupQueue> {
  const result = new Map<string, ConstrainedGroupQueue>();

  // Only process sequences that have a daysSince constraint
  const constrainedSequences = sequences.filter(
    (s) => s.daysSince > 0 && s.groupIds.length > 1,
  );
  if (constrainedSequences.length === 0) return result;

  // Build a map of active services per group: Map<groupId, CrawlService[]>
  // These are copies — safe to mutate during the crawl.
  const activeServicesByGroup = new Map<string, CrawlService[]>();

  for (const servCode of servCodes) {
    const groupId = servCodeToGroupId.get(servCode.servCodeId);
    if (!groupId) continue;

    for (const service of servCode.services) {
      if (service.status === "N") continue;

      // Only include active (not yet completed) services in the crawl queues.
      // Completed services are already reflected in the pool state from the past phase.
      if (!ACTIVE_STATUSES.has(service.status) && service.status !== "$") continue;

      // Exclude credit-hold customers — their services are removed from poolRemaining
      // in the present phase and must not appear in the constrained queues either.
      if (service.program.customer.x.isCreditHold) continue;

      if (!activeServicesByGroup.has(groupId)) {
        activeServicesByGroup.set(groupId, []);
      }
      activeServicesByGroup.get(groupId)!.push({
        servId: service.servId,
        progId: service.progId,
        price: service.price,
        doneDate: null,
      });
    }
  }

  // Build a lookup of completed predecessor services by progId for each group.
  // Map<groupId, Map<progId, doneDate>> — only completed services with a doneDate.
  const completedByProgIdByGroup = new Map<string, Map<number, string>>();

  for (const servCode of servCodes) {
    const groupId = servCodeToGroupId.get(servCode.servCodeId);
    if (!groupId) continue;

    for (const service of servCode.services) {
      const doneDate = service.production?.doneDate;
      // Guard against empty string doneDates (remapServiceHistory returns "" when date is null)
      if (!doneDate || doneDate.length < 10 || doneDate > mainDate) continue;

      if (!completedByProgIdByGroup.has(groupId)) {
        completedByProgIdByGroup.set(groupId, new Map());
      }
      // Keep the most recent doneDate if multiple services in the same group share a progId
      const existing = completedByProgIdByGroup.get(groupId)!.get(service.progId);
      if (!existing || doneDate > existing) {
        completedByProgIdByGroup.get(groupId)!.set(service.progId, doneDate);
      }
    }
  }

  // For each constrained sequence, build queues for all groups
  for (const sequence of constrainedSequences) {
    const { groupIds, daysSince } = sequence;

    for (let i = 0; i < groupIds.length; i++) {
      const groupId = groupIds[i]!;
      const activeServices = activeServicesByGroup.get(groupId) ?? [];

      if (i === 0) {
        // First group — no constraint, all services available immediately.
        // Sort price descending for the binary-split fill algorithm.
        const sorted = [...activeServices].sort((a, b) => b.price - a.price);
        result.set(groupId, { available: sorted, pending: [] as CrawlService[], completed: [] as CrawlService[] });
      } else {
        // Successor group — partition by whether predecessor is done long enough ago.
        const predecessorGroupId = groupIds[i - 1]!;
        const predecessorCompletedByProgId = completedByProgIdByGroup.get(predecessorGroupId) ?? new Map<number, string>();

        // Build the set of progIds that have an active predecessor service.
        // If a successor's progId has no predecessor service at all (program started mid-sequence),
        // the successor is unconstrained and goes directly to available.
        const predecessorActiveProgIds = new Set(
          (activeServicesByGroup.get(predecessorGroupId) ?? []).map((s) => s.progId),
        );

        const available: CrawlService[] = [];
        const pending: CrawlService[] = [];

        for (const service of activeServices) {
          const predecessorDoneDate = predecessorCompletedByProgId.get(service.progId) ?? null;
          if (predecessorDoneDate !== null) {
            // Predecessor is already completed — check if daysSince has elapsed
            const availableDate = addCalendarDays(predecessorDoneDate, daysSince);
            if (availableDate <= mainDate) {
              available.push(service);
            } else {
              // Predecessor done but not long enough ago yet — still pending
              pending.push(service);
            }
          } else if (!predecessorActiveProgIds.has(service.progId)) {
            // No predecessor service exists for this program (e.g. program started mid-sequence).
            // No constraint to enforce — available immediately.
            available.push(service);
          } else {
            // Predecessor exists but not yet completed — pending until crawl projects its completion
            pending.push(service);
          }
        }

        // Sort available by price descending
        available.sort((a, b) => b.price - a.price);
        result.set(groupId, { available, pending, completed: [] });
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helper — add calendar days to an ISO date string
// ---------------------------------------------------------------------------

/**
 * Adds n calendar days to an ISO date string (yyyy-MM-dd).
 * Uses simple arithmetic — no timezone issues since we're working with date-only strings.
 */
function addCalendarDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export { addCalendarDays };
