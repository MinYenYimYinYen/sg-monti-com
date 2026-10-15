import { PaceEngineInputs } from "@/app/pace/lib/PaceEngineInputs";
import { DailyTimingSnapshot, SequenceTimingStats, ServiceTimingEntry } from "@/app/pace/lib/PaceEngineTypes";
import { CrawlerDay } from "@/app/pace/lib/crawlerDay/CrawlerDay";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

const COMPLETED_STATUSES = new Set(getServiceStatuses(["completed"]));
const ACTIVE_STATUSES = new Set(getServiceStatuses(["active", "asap", "printed"]));

// ---------------------------------------------------------------------------
// computeSequenceTimingStats
// ---------------------------------------------------------------------------

/**
 * Computes daysSince timing statistics for every constrained successor group
 * in every sequence with daysSince > 0.
 *
 * Returns two SequenceTimingStats entries per constrained successor group:
 *   - phase "past":   completed successor services (doneDate <= mainDate)
 *   - phase "future": active/printed successor services (not yet completed)
 *
 * Each entry also includes `dailySnapshots` — per-crawl-day distributions of
 * elapsed days for active successor services, showing how the constraint evolves
 * over the timeline.
 *
 * For past entries, elapsedDays = successorDoneDate - predecessorDoneDate.
 * For future entries, elapsedDays = mainDate - predecessorDoneDate (if predecessor done).
 *
 * isLocked:
 *   - Past:   true when the successor was worked before daysSince elapsed (violation).
 *   - Future: true when elapsedDays < daysSince or predecessor not yet done.
 */
export function computeSequenceTimingStats(
  inputs: PaceEngineInputs,
  crawlerDays: CrawlerDay[],
): SequenceTimingStats[] {
  const { sequences, servCodes, mainDate } = inputs;

  const constrainedSequences = sequences.filter((s) => s.daysSince > 0 && s.groupIds.length > 1);
  if (constrainedSequences.length === 0) return [];

  // Build Map<servCodeId, groupId> for quick group lookup
  const servCodeToGroupId = new Map<string, string>();
  for (const servCode of servCodes) {
    for (const ag of inputs.assignmentGroups) {
      if (ag.servCodeIds.includes(servCode.servCodeId)) {
        servCodeToGroupId.set(servCode.servCodeId, ag.groupId);
        break;
      }
    }
  }

  // Build Map<groupId, Map<progId, { servId, doneDate }>> for completed services
  // and Map<groupId, Map<progId, servId>> for active services
  type CompletedInfo = { servId: number; doneDate: string };
  type ActiveInfo = { servId: number };

  const completedByGroupByProgId = new Map<string, Map<number, CompletedInfo>>();
  const activeByGroupByProgId = new Map<string, Map<number, ActiveInfo>>();

  for (const servCode of servCodes) {
    const groupId = servCodeToGroupId.get(servCode.servCodeId);
    if (!groupId) continue;

    for (const service of servCode.services) {
      if (service.status === "N") continue;

      if (COMPLETED_STATUSES.has(service.status) && service.production?.doneDate) {
        const doneDate = service.production.doneDate;
        if (doneDate.length < 10) continue;
        if (!completedByGroupByProgId.has(groupId)) completedByGroupByProgId.set(groupId, new Map());
        const existing = completedByGroupByProgId.get(groupId)!.get(service.progId);
        if (!existing || doneDate > existing.doneDate) {
          completedByGroupByProgId.get(groupId)!.set(service.progId, { servId: service.servId, doneDate });
        }
      } else if (ACTIVE_STATUSES.has(service.status)) {
        if (!activeByGroupByProgId.has(groupId)) activeByGroupByProgId.set(groupId, new Map());
        if (!activeByGroupByProgId.get(groupId)!.has(service.progId)) {
          activeByGroupByProgId.get(groupId)!.set(service.progId, { servId: service.servId });
        }
      }
    }
  }

  // Build program-level latest doneDate map: Map<progId, string>
  // Used for daily snapshots — the most recent completion across all services in a program.
  const latestDoneDateByProgId = new Map<number, string>();
  for (const servCode of servCodes) {
    for (const service of servCode.services) {
      if (!COMPLETED_STATUSES.has(service.status) || !service.production?.doneDate) continue;
      const doneDate = service.production.doneDate;
      if (doneDate.length < 10) continue;
      const existing = latestDoneDateByProgId.get(service.progId);
      if (!existing || doneDate > existing) {
        latestDoneDateByProgId.set(service.progId, doneDate);
      }
    }
  }

  // Sorted list of crawl dates for daily snapshots
  const crawlDates = crawlerDays.map((d) => d.date);

  const result: SequenceTimingStats[] = [];

  for (const sequence of constrainedSequences) {
    const { sequenceId, daysSince, groupIds } = sequence;

    for (let i = 1; i < groupIds.length; i++) {
      const successorGroupId = groupIds[i]!;
      const predecessorGroupId = groupIds[i - 1]!;

      const predecessorCompleted = completedByGroupByProgId.get(predecessorGroupId) ?? new Map<number, CompletedInfo>();
      const predecessorActive = activeByGroupByProgId.get(predecessorGroupId) ?? new Map<number, ActiveInfo>();

      // ---------------------------------------------------------------------------
      // Past stats — completed successor services
      // ---------------------------------------------------------------------------

      const pastServices: ServiceTimingEntry[] = [];
      const successorCompleted = completedByGroupByProgId.get(successorGroupId) ?? new Map<number, CompletedInfo>();

      for (const [progId, successorInfo] of successorCompleted) {
        const predecessorInfo = predecessorCompleted.get(progId);
        if (!predecessorInfo) {
          pastServices.push({ servId: successorInfo.servId, progId, elapsedDays: null, isLocked: false });
          continue;
        }
        const elapsed = calendarDaysBetween(predecessorInfo.doneDate, successorInfo.doneDate);
        pastServices.push({ servId: successorInfo.servId, progId, elapsedDays: elapsed, isLocked: elapsed < daysSince });
      }

      // ---------------------------------------------------------------------------
      // Future stats — active/printed successor services
      // ---------------------------------------------------------------------------

      const futureServices: ServiceTimingEntry[] = [];
      const successorActive = activeByGroupByProgId.get(successorGroupId) ?? new Map<number, ActiveInfo>();

      for (const [progId, successorInfo] of successorActive) {
        const predecessorInfo = predecessorCompleted.get(progId);
        if (!predecessorInfo) {
          const predecessorIsActive = predecessorActive.has(progId);
          futureServices.push({ servId: successorInfo.servId, progId, elapsedDays: null, isLocked: predecessorIsActive });
          continue;
        }
        const elapsed = calendarDaysBetween(predecessorInfo.doneDate, mainDate);
        futureServices.push({ servId: successorInfo.servId, progId, elapsedDays: elapsed, isLocked: elapsed < daysSince });
      }

      // ---------------------------------------------------------------------------
      // Daily snapshots — per-crawl-date distribution for active successor services
      //
      // For each crawl date, compute elapsed days for each active successor service
      // using the program-level latestDoneDate as of that date. This shows how the
      // constraint evolves: how many services unlock each day and what the
      // elapsed-days quartiles look like at each point in time.
      //
      // We only use historical latestDoneDate (from Redux state) — projected
      // completions during the future crawl are not reflected here. This is
      // intentional: the snapshots show the constraint as it stands from real data.
      // ---------------------------------------------------------------------------

      const dailySnapshots: DailyTimingSnapshot[] = crawlDates.map((date): DailyTimingSnapshot => {
        const elapsedValues: number[] = [];
        let countAvailable = 0;
        let countLocked = 0;
        let countPredecessorNotDone = 0;

        for (const [progId] of successorActive) {
          const latestDoneDate = latestDoneDateByProgId.get(progId) ?? null;
          if (latestDoneDate === null || latestDoneDate > date) {
            // Predecessor not yet done as of this date
            countPredecessorNotDone++;
          } else {
            const elapsed = calendarDaysBetween(latestDoneDate, date);
            elapsedValues.push(elapsed);
            if (elapsed >= daysSince) {
              countAvailable++;
            } else {
              countLocked++;
            }
          }
        }

        const sorted = [...elapsedValues].sort((a, b) => a - b);
        const median = sorted.length > 0 ? percentile(sorted, 0.5) : null;
        const q1 = sorted.length >= 4 ? percentile(sorted, 0.25) : null;
        const q3 = sorted.length >= 4 ? percentile(sorted, 0.75) : null;

        return { date, countAvailable, countLocked, countPredecessorNotDone, median, q1, q3 };
      });

      result.push(buildStats({ sequenceId, groupId: successorGroupId, daysSince, phase: "past", services: pastServices, dailySnapshots }));
      result.push(buildStats({ sequenceId, groupId: successorGroupId, daysSince, phase: "future", services: futureServices, dailySnapshots }));
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// buildStats — aggregate a ServiceTimingEntry[] into a SequenceTimingStats
// ---------------------------------------------------------------------------

function buildStats({
  sequenceId,
  groupId,
  daysSince,
  phase,
  services,
  dailySnapshots,
}: {
  sequenceId: string;
  groupId: string;
  daysSince: number;
  phase: "past" | "future";
  services: ServiceTimingEntry[];
  dailySnapshots: DailyTimingSnapshot[];
}): SequenceTimingStats {
  const count = services.length;
  const countLocked = services.filter((s) => s.isLocked).length;
  const countAvailable = services.filter((s) => !s.isLocked && s.elapsedDays !== null).length;
  const countPredecessorNotDone = services.filter((s) => s.elapsedDays === null).length;

  const elapsedValues = services
    .map((s) => s.elapsedDays)
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b);

  const mean = elapsedValues.length > 0
    ? elapsedValues.reduce((sum, v) => sum + v, 0) / elapsedValues.length
    : null;

  const median = elapsedValues.length > 0 ? percentile(elapsedValues, 0.5) : null;
  const q1 = elapsedValues.length >= 4 ? percentile(elapsedValues, 0.25) : null;
  const q3 = elapsedValues.length >= 4 ? percentile(elapsedValues, 0.75) : null;

  return { sequenceId, groupId, daysSince, phase, services, count, countLocked, countAvailable, countPredecessorNotDone, median, mean, q1, q3, dailySnapshots };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Linear interpolation percentile on a pre-sorted ascending array. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const frac = idx - lo;
  return sorted[lo]! + frac * (sorted[hi]! - sorted[lo]!);
}

/** Calendar days from dateA to dateB (positive when dateB > dateA). */
function calendarDaysBetween(dateA: string, dateB: string): number {
  const msPerDay = 86_400_000;
  return Math.round((new Date(dateB + "T00:00:00").getTime() - new Date(dateA + "T00:00:00").getTime()) / msPerDay);
}
