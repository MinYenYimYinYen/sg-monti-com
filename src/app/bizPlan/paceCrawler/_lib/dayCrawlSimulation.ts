import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import {
  CrawlerResult,
  CrawlerServCodeResult,
  DayCrawlEmployeeEntry,
  DayCrawlServCodeEntry,
  EmployeeTimelineEvent,
} from "@/app/bizPlan/paceCrawler/PaceCrawlerTypes";

// ---------------------------------------------------------------------------
// Day-Crawl Simulation
// ---------------------------------------------------------------------------

/**
 * Runs the day-crawl simulation.
 *
 * Walks forward one weekday at a time from `today`. On each day, each employee
 * works their highest-priority eligible servCode that still has pool remaining.
 * Sequential progCodes are handled by locking N+1 until N drains.
 *
 * Returns projected end dates, proposed date ranges, and per-employee timeline events.
 */
export function runDayCrawlSimulation(
  servCodeEntries: DayCrawlServCodeEntry[],
  employeeEntries: DayCrawlEmployeeEntry[],
  today: string,
): CrawlerResult {
  // ---------------------------------------------------------------------------
  // 1. Initialize pools (mutable clones — never mutate inputs)
  // ---------------------------------------------------------------------------
  const pools = new Map<string, number>();
  for (const entry of servCodeEntries) {
    pools.set(entry.servCodeId, entry.pool);
  }

  // ---------------------------------------------------------------------------
  // 2. Initialize resolved open date floors (mutable — sequential N+1 updated during crawl)
  // ---------------------------------------------------------------------------
  const resolvedOpenDateFloor = new Map<string, string>();
  for (const entry of servCodeEntries) {
    resolvedOpenDateFloor.set(entry.servCodeId, entry.openDateFloor);
  }

  // ---------------------------------------------------------------------------
  // 3. Build sequential groups and initialize locks
  //
  // For each runsInSequence progCode, sort servCodes by openDateFloor ascending.
  // Lock all except the first (index 0). The first is unlocked from the start.
  // ---------------------------------------------------------------------------
  const sequentialLocks = new Map<string, boolean>();
  const sequentialSuccessor = new Map<string, string>(); // servCodeId → next servCodeId in sequence

  const sequentialGroups = new Map<string, DayCrawlServCodeEntry[]>();
  for (const entry of servCodeEntries) {
    if (!entry.runsInSequence) continue;
    const group = sequentialGroups.get(entry.progCodeId) ?? [];
    group.push(entry);
    sequentialGroups.set(entry.progCodeId, group);
  }

  for (const group of sequentialGroups.values()) {
    const sorted = [...group].sort((a, b) => a.openDateFloor.localeCompare(b.openDateFloor));
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      sequentialLocks.set(current.servCodeId, i > 0);
      if (i < sorted.length - 1) {
        sequentialSuccessor.set(current.servCodeId, sorted[i + 1].servCodeId);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Track projected end dates
  // ---------------------------------------------------------------------------
  const projectedEndDate = new Map<string, string | null>();
  for (const entry of servCodeEntries) {
    projectedEndDate.set(entry.servCodeId, null);
  }

  // ---------------------------------------------------------------------------
  // 5. Initialize timeline tracking per employee
  // ---------------------------------------------------------------------------
  const employeeTimeline = new Map<string, { date: string; event: EmployeeTimelineEvent }[]>();
  const lastWorkedServCode = new Map<string, string | null>(); // employeeId → last servCodeId worked
  const inDowntime = new Map<string, boolean>(); // employeeId → currently in a downtime stretch

  for (const employee of employeeEntries) {
    employeeTimeline.set(employee.employeeId, []);
    lastWorkedServCode.set(employee.employeeId, null);
    inDowntime.set(employee.employeeId, false);
  }

  // ---------------------------------------------------------------------------
  // 6. Walk forward day by day
  // ---------------------------------------------------------------------------
  const maxDay = dateStrings.addWeekdays(today, 365); // safety cap

  let day = dateStrings.nextWeekdayAfter(today); // start from next weekday

  while (day <= maxDay) {
    let anyRemaining = false;
    for (const [, pool] of pools) {
      if (pool > 0) {
        anyRemaining = true;
        break;
      }
    }
    if (!anyRemaining) break;

    for (const employee of employeeEntries) {
      const personalOpenDate = employee.nextAvailableDate;
      const timeline = employeeTimeline.get(employee.employeeId)!;
      const prevServCodeId = lastWorkedServCode.get(employee.employeeId) ?? null;

      let workedServCodeId: string | null = null;

      for (const servCodeId of employee.servCodeIds) {
        if (sequentialLocks.get(servCodeId) === true) continue;

        const floor = resolvedOpenDateFloor.get(servCodeId);
        if (!floor) continue;

        const effectiveOpenDate = personalOpenDate > floor ? personalOpenDate : floor;
        if (day < effectiveOpenDate) continue;

        const pool = pools.get(servCodeId) ?? 0;
        if (pool <= 0) continue;

        const rate = employee.dailyRates.get(servCodeId) ?? 0;
        if (rate <= 0) continue;

        const drain = Math.min(rate, pool);
        const newPool = pool - drain;
        pools.set(servCodeId, newPool);

        workedServCodeId = servCodeId;

        // Record timeline events for this employee
        if (prevServCodeId === null) {
          // First time working anything
          timeline.push({ date: day, event: { kind: "starts", servCodeId, fromServCodeId: null } });
        } else if (prevServCodeId !== servCodeId) {
          // Switched servCodes
          timeline.push({ date: day, event: { kind: "switches", fromServCodeId: prevServCodeId, toServCodeId: servCodeId } });
          timeline.push({ date: day, event: { kind: "starts", servCodeId, fromServCodeId: prevServCodeId } });
        }
        // Clear downtime flag
        inDowntime.set(employee.employeeId, false);

        // Check if pool just drained
        if (newPool <= 0 && projectedEndDate.get(servCodeId) === null) {
          projectedEndDate.set(servCodeId, day);
          timeline.push({ date: day, event: { kind: "finishes", servCodeId } });

          // Unlock sequential successor
          const successor = sequentialSuccessor.get(servCodeId);
          if (successor) {
            sequentialLocks.set(successor, false);
            const nextDay = dateStrings.nextWeekdayAfter(day);
            const currentFloor = resolvedOpenDateFloor.get(successor) ?? nextDay;
            resolvedOpenDateFloor.set(
              successor,
              nextDay > currentFloor ? nextDay : currentFloor,
            );
          }
        }

        break; // employee works one servCode per day
      }

      // Record downtime if employee had no eligible work
      if (workedServCodeId === null) {
        if (!inDowntime.get(employee.employeeId)) {
          timeline.push({ date: day, event: { kind: "downtime" } });
          inDowntime.set(employee.employeeId, true);
        }
      }

      lastWorkedServCode.set(employee.employeeId, workedServCodeId);
    }

    day = dateStrings.nextWeekdayAfter(day);
  }

  // ---------------------------------------------------------------------------
  // 7. Build CrawlerResult
  // ---------------------------------------------------------------------------
  const byServCode = new Map<string, CrawlerServCodeResult>();

  for (const entry of servCodeEntries) {
    const endDate = projectedEndDate.get(entry.servCodeId) ?? null;
    const openFloor = resolvedOpenDateFloor.get(entry.servCodeId) ?? entry.openDateFloor;

    const proposedMax =
      endDate != null
        ? dateStrings.addWeekdays(endDate, entry.paddingDays)
        : entry.currentMax;

    byServCode.set(entry.servCodeId, {
      servCodeId: entry.servCodeId,
      resolvedOpenDateFloor: openFloor,
      projectedEndDate: endDate,
      proposedMin: openFloor,
      proposedMax,
    });
  }

  return { byServCode, employeeTimeline };
}
