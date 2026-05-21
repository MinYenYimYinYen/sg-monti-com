import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import {
  CrawlerResult,
  CrawlerServCodeResult,
  DayCrawlEmployeeEntry,
  DayCrawlServCodeEntry,
  EmployeeTimelineEvent,
  ServCodeTimelineEvent,
} from "@/app/bizPlan/paceCrawler/PaceCrawlerTypes";

// ---------------------------------------------------------------------------
// Day-Crawl Simulation
// ---------------------------------------------------------------------------

/**
 * Runs the day-crawl simulation.
 *
 * Walks forward one weekday at a time from `today`. On each day, each employee
 * works their highest-priority eligible entry (single servCode or group).
 * Sequential progCodes are handled by locking N+1 until N drains.
 * Group entries drain all member pools simultaneously at the employee's totalAvgDailyPrice.
 *
 * Returns projected end dates, proposed date ranges, per-employee timeline events,
 * and per-entry (servCode/group) crew transition events with pool snapshots.
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
  // ---------------------------------------------------------------------------
  const sequentialLocks = new Map<string, boolean>();
  const sequentialSuccessor = new Map<string, string>();

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
  // 5. Initialize employee timeline tracking
  // ---------------------------------------------------------------------------
  const employeeTimeline = new Map<string, { date: string; event: EmployeeTimelineEvent }[]>();
  const lastWorkedEntryLabel = new Map<string, string | null>();
  const inDowntime = new Map<string, boolean>();

  for (const employee of employeeEntries) {
    employeeTimeline.set(employee.employeeId, []);
    lastWorkedEntryLabel.set(employee.employeeId, null);
    inDowntime.set(employee.employeeId, false);
  }

  // ---------------------------------------------------------------------------
  // 5b. Initialize servCode timeline tracking
  //
  // activeEmployeesByEntry: tracks which employees are currently working each entry.
  // servCodeTimeline: the output — per-entry crew transition events.
  // ---------------------------------------------------------------------------
  const activeEmployeesByEntry = new Map<string, Set<string>>();
  const servCodeTimeline = new Map<string, ServCodeTimelineEvent[]>();

  // Helper: get the current pool for an entry label (sum for groups, direct for singles)
  function getEntryPool(entryLabel: string): number {
    // Check if it's a group label (contains "+") — look up all member pools
    // We identify groups by checking if any servCode entry has this label
    // For simplicity: try direct lookup first, then sum if not found
    const directPool = pools.get(entryLabel);
    if (directPool !== undefined) return directPool;
    // It's a group — find members by scanning employee entries
    for (const employee of employeeEntries) {
      for (const pe of employee.priorityEntries) {
        if (pe.kind === "group" && pe.label === entryLabel) {
          return pe.servCodeIds.reduce((sum, id) => sum + (pools.get(id) ?? 0), 0);
        }
      }
    }
    return 0;
  }

  // Helper: get an employee's daily rate for an entry label
  function getEmployeeRateForEntry(employee: DayCrawlEmployeeEntry, entryLabel: string): number {
    // Check if it's a single servCode
    const directRate = employee.dailyRates.get(entryLabel);
    if (directRate !== undefined) return directRate;
    // It's a group — use totalAvgDailyPrice
    return employee.totalAvgDailyPrice;
  }

  // Helper: compute team drain rate = sum of active employees' rates for this entry
  function computeTeamRate(entryLabel: string): number {
    const active = activeEmployeesByEntry.get(entryLabel);
    if (!active || active.size === 0) return 0;
    let total = 0;
    for (const empId of active) {
      const emp = employeeEntries.find((e) => e.employeeId === empId);
      if (emp) total += getEmployeeRateForEntry(emp, entryLabel);
    }
    return total;
  }

  // Helper: record a ServCodeTimelineEvent
  function recordServCodeEvent(
    entryLabel: string,
    date: string,
    employeeId: string,
    kind: ServCodeTimelineEvent["kind"],
    toServCode?: string,
    fromServCode?: string,
  ) {
    const emp = employeeEntries.find((e) => e.employeeId === employeeId);
    const employeeDailyRate = emp ? getEmployeeRateForEntry(emp, entryLabel) : 0;
    const teamDailyRate = computeTeamRate(entryLabel);
    const poolRemaining = getEntryPool(entryLabel);

    const events = servCodeTimeline.get(entryLabel) ?? [];
    events.push({
      date,
      employeeId,
      kind,
      toServCode,
      fromServCode,
      employeeDailyRate,
      teamDailyRate,
      poolRemaining,
    });
    servCodeTimeline.set(entryLabel, events);
  }

  // ---------------------------------------------------------------------------
  // 6. Walk forward day by day
  // ---------------------------------------------------------------------------
  const maxDay = dateStrings.addWeekdays(today, 365);
  let day = dateStrings.nextWeekdayAfter(today);

  while (day <= maxDay) {
    let anyRemaining = false;
    for (const [, pool] of pools) {
      if (pool > 0) { anyRemaining = true; break; }
    }
    if (!anyRemaining) break;

    for (const employee of employeeEntries) {
      const personalOpenDate = employee.nextAvailableDate;
      const timeline = employeeTimeline.get(employee.employeeId)!;
      const prevEntryLabel = lastWorkedEntryLabel.get(employee.employeeId) ?? null;

      let workedEntryLabel: string | null = null;

      for (const priorityEntry of employee.priorityEntries) {
        if (priorityEntry.kind === "single") {
          const { servCodeId } = priorityEntry;

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
          workedEntryLabel = servCodeId;

          // Employee timeline
          if (prevEntryLabel === null) {
            timeline.push({ date: day, event: { kind: "starts", entryLabel: servCodeId, fromEntryLabel: null } });
          } else if (prevEntryLabel !== servCodeId) {
            timeline.push({ date: day, event: { kind: "switches", fromEntryLabel: prevEntryLabel, toEntryLabel: servCodeId } });
            timeline.push({ date: day, event: { kind: "starts", entryLabel: servCodeId, fromEntryLabel: prevEntryLabel } });
          }
          inDowntime.set(employee.employeeId, false);

          // ServCode timeline — handle entry/exit transitions
          if (prevEntryLabel !== servCodeId) {
            // Employee is starting or returning to this entry
            if (prevEntryLabel !== null) {
              // Leaving previous entry
              const prevActive = activeEmployeesByEntry.get(prevEntryLabel);
              if (prevActive) prevActive.delete(employee.employeeId);
              recordServCodeEvent(prevEntryLabel, day, employee.employeeId, "leaves", servCodeId);
            }
            // Joining this entry
            if (!activeEmployeesByEntry.has(servCodeId)) activeEmployeesByEntry.set(servCodeId, new Set());
            activeEmployeesByEntry.get(servCodeId)!.add(employee.employeeId);
            const kind = prevEntryLabel === null ? "starts" : "returns";
            recordServCodeEvent(servCodeId, day, employee.employeeId, kind, undefined, prevEntryLabel ?? undefined);
          }

          // Check if pool just drained
          if (newPool <= 0 && projectedEndDate.get(servCodeId) === null) {
            projectedEndDate.set(servCodeId, day);
            timeline.push({ date: day, event: { kind: "finishes", entryLabel: servCodeId } });
            // Record finishes in servCode timeline
            activeEmployeesByEntry.get(servCodeId)?.delete(employee.employeeId);
            recordServCodeEvent(servCodeId, day, employee.employeeId, "finishes");

            const successor = sequentialSuccessor.get(servCodeId);
            if (successor) {
              sequentialLocks.set(successor, false);
              resolvedOpenDateFloor.set(successor, dateStrings.nextWeekdayAfter(day));
            }
          }

          break;

        } else {
          const { servCodeIds, label } = priorityEntry;

          let groupLocked = false;
          let groupFloor: string | null = null;
          let groupHasPool = false;

          for (const servCodeId of servCodeIds) {
            if (sequentialLocks.get(servCodeId) === true) { groupLocked = true; break; }
            const floor = resolvedOpenDateFloor.get(servCodeId);
            const pool = pools.get(servCodeId) ?? 0;
            if (pool > 0) {
              groupHasPool = true;
              if (floor != null) {
                if (groupFloor === null) { groupFloor = floor; }
                else if (floor.localeCompare(groupFloor) < 0) { groupFloor = floor; }
              }
            }
          }

          if (groupLocked) continue;
          if (!groupHasPool) continue;
          if (!groupFloor) continue;

          const effectiveOpenDate = personalOpenDate > groupFloor ? personalOpenDate : groupFloor;
          if (day < effectiveOpenDate) continue;

          const rate = employee.totalAvgDailyPrice;
          if (rate <= 0) continue;

          const memberPools = servCodeIds.map((id) => pools.get(id) ?? 0);
          const totalPool = memberPools.reduce((sum, p) => sum + p, 0);
          if (totalPool <= 0) continue;

          const actualDrain = Math.min(rate, totalPool);
          let anyMemberDrained = false;

          for (let i = 0; i < servCodeIds.length; i++) {
            const servCodeId = servCodeIds[i];
            const memberPool = memberPools[i];
            if (memberPool <= 0) continue;

            const memberDrain = Math.min(memberPool, actualDrain * (memberPool / totalPool));
            const newPool = memberPool - memberDrain;
            pools.set(servCodeId, newPool);
            anyMemberDrained = true;

            if (newPool <= 0 && projectedEndDate.get(servCodeId) === null) {
              projectedEndDate.set(servCodeId, day);
              timeline.push({ date: day, event: { kind: "finishes", entryLabel: label } });

              const successor = sequentialSuccessor.get(servCodeId);
              if (successor) {
                sequentialLocks.set(successor, false);
                resolvedOpenDateFloor.set(successor, dateStrings.nextWeekdayAfter(day));
              }
            }
          }

          if (!anyMemberDrained) continue;

          workedEntryLabel = label;

          // Employee timeline
          if (prevEntryLabel === null) {
            timeline.push({ date: day, event: { kind: "starts", entryLabel: label, fromEntryLabel: null } });
          } else if (prevEntryLabel !== label) {
            timeline.push({ date: day, event: { kind: "switches", fromEntryLabel: prevEntryLabel, toEntryLabel: label } });
            timeline.push({ date: day, event: { kind: "starts", entryLabel: label, fromEntryLabel: prevEntryLabel } });
          }
          inDowntime.set(employee.employeeId, false);

          // ServCode timeline — handle entry/exit transitions for group
          if (prevEntryLabel !== label) {
            if (prevEntryLabel !== null) {
              const prevActive = activeEmployeesByEntry.get(prevEntryLabel);
              if (prevActive) prevActive.delete(employee.employeeId);
              recordServCodeEvent(prevEntryLabel, day, employee.employeeId, "leaves", label);
            }
            if (!activeEmployeesByEntry.has(label)) activeEmployeesByEntry.set(label, new Set());
            activeEmployeesByEntry.get(label)!.add(employee.employeeId);
            const kind = prevEntryLabel === null ? "starts" : "returns";
            recordServCodeEvent(label, day, employee.employeeId, kind, undefined, prevEntryLabel ?? undefined);
          }

          // Check if all member pools drained — record group finishes
          const allDrained = servCodeIds.every((id) => (pools.get(id) ?? 0) <= 0);
          if (allDrained) {
            activeEmployeesByEntry.get(label)?.delete(employee.employeeId);
            recordServCodeEvent(label, day, employee.employeeId, "finishes");
          }

          break;
        }
      }

      // Record downtime
      if (workedEntryLabel === null) {
        // If employee was working something, they're leaving it (no eligible work)
        if (prevEntryLabel !== null) {
          const prevActive = activeEmployeesByEntry.get(prevEntryLabel);
          if (prevActive) prevActive.delete(employee.employeeId);
          // Don't record a "leaves" event for downtime — it's implicit
        }
        if (!inDowntime.get(employee.employeeId)) {
          timeline.push({ date: day, event: { kind: "downtime" } });
          inDowntime.set(employee.employeeId, true);
        }
      }

      lastWorkedEntryLabel.set(employee.employeeId, workedEntryLabel);
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

  return { byServCode, employeeTimeline, servCodeTimeline };
}
