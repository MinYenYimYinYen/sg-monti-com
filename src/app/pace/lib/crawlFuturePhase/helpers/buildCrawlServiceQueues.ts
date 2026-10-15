import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

const ACTIVE_STATUSES = new Set(getServiceStatuses(["active", "asap"]));

// ---------------------------------------------------------------------------
// CrawlService — mutable service representation for the future crawl
// ---------------------------------------------------------------------------

/**
 * A lightweight wrapper around a service used during the future crawl.
 *
 * `doneDate` is the only mutable field — set when the crawl projects this
 * service as completed. All other data is accessed via the `service` reference.
 *
 * Carrying the full `Service` reference (rather than copying fields) avoids
 * redundant data and gives the crawl direct access to `service.program.x.latestDoneDate`
 * for the program-level daysSince constraint check.
 */
export type CrawlService = {
  servId: number;
  progId: number;
  price: number;
  /** Set when the service is completed — either historically or projected by the crawl. */
  doneDate: string | null;
  /** Reference to the full hydrated Service object. Not copied — just a pointer. */
  service: Service;
};

// ---------------------------------------------------------------------------
// ConstrainedGroupQueue — per-group mutable state for constrained sequences
// ---------------------------------------------------------------------------

/**
 * Mutable service queue for one group in a constrained sequence.
 *
 * `available` — services whose program's latestDoneDate + daysSince <= today.
 *   Sorted price descending. Consumed (spliced out) as employees work them.
 *
 * `pending` — services waiting for the daysSince constraint to be satisfied.
 *   Moved to `available` as projected doneDates advance during the crawl.
 */
export type ConstrainedGroupQueue = {
  /** Services ready to work today. Sorted price descending. Mutated during crawl. */
  available: CrawlService[];
  /** Services blocked by daysSince constraint. Moved to available as predecessors complete. */
  pending: CrawlService[];
  /**
   * Services that have been consumed (completed) by the crawl.
   * Each consumed service has `doneDate` set to the day it was worked.
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
 * `available` (program's latestDoneDate + daysSince <= mainDate) and `pending` (not yet).
 *
 * The daysSince constraint is checked at the **program level**: a successor service
 * cannot be worked until `daysSince` calendar days have elapsed since the most recent
 * completion of any service in the same program (`service.program.x.latestDoneDate`).
 * This is more correct than checking only the immediately preceding group's service,
 * because the constraint is about the program's treatment interval, not group membership.
 *
 * For sequences without `daysSince`, returns an empty map — those groups use
 * the existing `drainGroupPool` aggregate approach.
 *
 * @param servCodes - All servCodes with their services (from PaceEngineInputs).
 * @param sequences - Normalized sequences (including synthetic single-member ones).
 * @param servCodeToGroupId - Map<servCodeId, groupId> built during past phase.
 * @param groupServCodeIds - Map<groupId, Set<servCodeId>> of servCodeIds per group.
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

  // Collect the set of all groupIds that are part of a constrained sequence
  const constrainedGroupIds = new Set<string>();
  for (const sequence of constrainedSequences) {
    for (const groupId of sequence.groupIds) {
      constrainedGroupIds.add(groupId);
    }
  }

  // Build a map of active services per group: Map<groupId, CrawlService[]>
  // CrawlService carries a reference to the full Service object (not a copy).
  const activeServicesByGroup = new Map<string, CrawlService[]>();

  for (const servCode of servCodes) {
    const groupId = servCodeToGroupId.get(servCode.servCodeId);
    if (!groupId || !constrainedGroupIds.has(groupId)) continue;

    for (const service of servCode.services) {
      if (service.status === "N") continue;

      // Only include active (not yet completed) services in the crawl queues.
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
        service,
      });
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
        // Successor group — partition by whether the program's daysSince constraint is satisfied.
        //
        // Use service.program.x.latestDoneDate (the most recent completion across ALL services
        // in the program) rather than looking up only the predecessor group's service.
        // This correctly handles programs where a different group in the sequence was most
        // recently completed.
        const available: CrawlService[] = [];
        const pending: CrawlService[] = [];

        for (const crawlService of activeServices) {
          const latestDoneDate = crawlService.service.program.x.latestDoneDate;

          if (latestDoneDate !== null) {
            // Program has at least one completed service — check if daysSince has elapsed
            const availableDate = addCalendarDays(latestDoneDate, daysSince);
            if (availableDate <= mainDate) {
              available.push(crawlService);
            } else {
              // Not enough time has elapsed since the last service — still pending
              pending.push(crawlService);
            }
          } else {
            // No completed services in this program at all — no prior treatment means no
            // constraint to enforce. daysSince is a minimum gap *between* treatments;
            // if there has been no prior treatment, the service is available immediately.
            available.push(crawlService);
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
