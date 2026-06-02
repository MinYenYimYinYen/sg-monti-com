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
 * Returns projected end dates, optimized date ranges, per-employee timeline events,
 * and per-entry (servCode/group) crew transition events with pool snapshots.
 */
export function runDayCrawlSimulation(
  servCodeEntries: DayCrawlServCodeEntry[],
  employeeEntries: DayCrawlEmployeeEntry[],
  /** The first day to simulate. Computed by selectCrawlStart in paceCrawlerSelect. */
  crawlStart: string,
): CrawlerResult {
  // `today` is used as the internal loop variable name for clarity within the simulation.
  const today = crawlStart;
  // ---------------------------------------------------------------------------
  // 1. Initialize pools (mutable clones — never mutate inputs)
  // ---------------------------------------------------------------------------
  const pools = new Map<string, number>();
  for (const entry of servCodeEntries) {
    pools.set(entry.servCodeId, entry.pool);
  }

  // ---------------------------------------------------------------------------
  // 2. Initialize resolved servCode range mins (mutable — sequential N+1 updated during crawl)
  // ---------------------------------------------------------------------------
  const resolvedServCodeRangeMin = new Map<string, string>();
  for (const entry of servCodeEntries) {
    resolvedServCodeRangeMin.set(entry.servCodeId, entry.servCodeRangeMin);
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
    const sorted = [...group].sort((a, b) => a.servCodeRangeMin.localeCompare(b.servCodeRangeMin));
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
  // 3b. Pre-crawl sequential cascade for past-due servCodes.
  //
  // If a sequential servCode's window has already closed (crawlStart > servCodeRangeMax),
  // it will never drain during the crawl — its pool would stay locked forever.
  // Instead, carry its remaining pool forward to the next sequential servCode and
  // unlock the successor immediately. Cascade through the chain as needed.
  //
  // This handles the real-world case where a sequential round (e.g. LR1) is past its
  // season end date but still has remaining work. The work carries over to the next
  // round (LR2), which opens immediately. LR1 will appear as "LATE" in the Urgent card.
  // ---------------------------------------------------------------------------
  for (const group of sequentialGroups.values()) {
    const sorted = [...group].sort((a, b) => a.servCodeRangeMin.localeCompare(b.servCodeRangeMin));
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const successor = sorted[i + 1];
      const currentPool = pools.get(current.servCodeId) ?? 0;
      const isPastDue = today > current.servCodeRangeMax;

      if (isPastDue && currentPool > 0) {
        // Carry remaining pool forward to the successor
        const successorPool = pools.get(successor.servCodeId) ?? 0;
        pools.set(successor.servCodeId, successorPool + currentPool);
        pools.set(current.servCodeId, 0);
        // Unlock the successor. Use the predecessor's servCodeRangeMax as the floor
        // so the Gantt shows LR2 starting where LR1 ended (sequential continuity).
        // The effective open date for employees is max(personalOpenDate, floor), so
        // employees won't actually start before they're available — this only affects
        // the optimizedMin display and the "Apply Optimized Ranges" output.
        sequentialLocks.set(successor.servCodeId, false);
        resolvedServCodeRangeMin.set(successor.servCodeId, current.servCodeRangeMax);
      } else if (isPastDue && currentPool <= 0) {
        // Already drained and past due — just unlock the successor
        sequentialLocks.set(successor.servCodeId, false);
        resolvedServCodeRangeMin.set(successor.servCodeId, current.servCodeRangeMax);
      }
      // If not past due, leave the lock as-is (handled during the crawl)
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Walk forward day by day
  // ---------------------------------------------------------------------------
  const maxDay = dateStrings.addWeekdays(today, 365);
  let day = today;

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
          const floor = resolvedServCodeRangeMin.get(servCodeId);
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
            if (prevEntryLabel !== null) {
              const prevActive = activeEmployeesByEntry.get(prevEntryLabel);
              if (prevActive) prevActive.delete(employee.employeeId);
              recordServCodeEvent(prevEntryLabel, day, employee.employeeId, "leaves", servCodeId);
            }
            if (!activeEmployeesByEntry.has(servCodeId)) activeEmployeesByEntry.set(servCodeId, new Set());
            activeEmployeesByEntry.get(servCodeId)!.add(employee.employeeId);
            const kind = prevEntryLabel === null ? "starts" : "returns";
            recordServCodeEvent(servCodeId, day, employee.employeeId, kind, undefined, prevEntryLabel ?? undefined);
          }

            // Check if pool just drained
          if (newPool <= 0 && projectedEndDate.get(servCodeId) === null) {
            projectedEndDate.set(servCodeId, day);
            timeline.push({ date: day, event: { kind: "finishes", entryLabel: servCodeId } });
            activeEmployeesByEntry.get(servCodeId)?.delete(employee.employeeId);
            recordServCodeEvent(servCodeId, day, employee.employeeId, "finishes");

            const successor = sequentialSuccessor.get(servCodeId);
            if (successor) {
              sequentialLocks.set(successor, false);
              // Use `day` (not nextWeekdayAfter) so the successor opens immediately —
              // the employee already used today for the predecessor, so they'll pick up
              // the successor on the very next day with no gap.
              resolvedServCodeRangeMin.set(successor, day);
            }
          }

          break;

        } else {
          const { servCodeIds, label } = priorityEntry;

          // Build the set of eligible (unlocked) members for this day.
          // Locked sequential members are skipped — they are waiting for their predecessor
          // to drain. The group proceeds with whatever unlocked members have pool remaining.
          // This prevents a deadlock where N+1 locked members permanently block the group
          // from working the unlocked N member.
          let groupFloor: string | null = null;
          let groupHasPool = false;

          const eligibleMemberIds: string[] = [];

          for (const servCodeId of servCodeIds) {
            if (sequentialLocks.get(servCodeId) === true) continue; // locked — skip, not a deadlock
            const floor = resolvedServCodeRangeMin.get(servCodeId);
            const pool = pools.get(servCodeId) ?? 0;
            if (pool > 0) {
              groupHasPool = true;
              eligibleMemberIds.push(servCodeId);
              if (floor != null) {
                if (groupFloor === null) { groupFloor = floor; }
                else if (floor.localeCompare(groupFloor) < 0) { groupFloor = floor; }
              }
            }
          }

          if (!groupHasPool) continue;
          if (!groupFloor) continue;

          const effectiveOpenDate = personalOpenDate > groupFloor ? personalOpenDate : groupFloor;
          if (day < effectiveOpenDate) continue;

          const rate = employee.totalAvgDailyPrice;
          if (rate <= 0) continue;

          const memberPools = eligibleMemberIds.map((id) => pools.get(id) ?? 0);
          const totalPool = memberPools.reduce((sum, p) => sum + p, 0);
          if (totalPool <= 0) continue;

          const actualDrain = Math.min(rate, totalPool);
          let anyMemberDrained = false;

          for (let i = 0; i < eligibleMemberIds.length; i++) {
            const servCodeId = eligibleMemberIds[i];
            const memberPool = memberPools[i];
            if (memberPool <= 0) continue;

            const memberDrain = Math.min(memberPool, actualDrain * (memberPool / totalPool));
            const newPool = memberPool - memberDrain;
            pools.set(servCodeId, newPool);
            anyMemberDrained = true;

            // Sequential successor unlock — handled per-member so the successor opens
            // as soon as this member's pool drains (even if other group members haven't).
            if (newPool <= 0) {
              const successor = sequentialSuccessor.get(servCodeId);
              if (successor) {
                sequentialLocks.set(successor, false);
                // Use `day` (not nextWeekdayAfter) so the successor opens immediately —
                // the employee already used today for the predecessor, so they'll pick up
                // the successor on the very next day with no gap.
                resolvedServCodeRangeMin.set(successor, day);
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

          // Check if all member pools drained — record group finishes and set a shared
          // projectedEndDate for all members. Using the allDrained moment (rather than
          // per-member drain) guarantees every member gets the same optimizedMax, which
          // is the correct model: grouped servCodes are worked simultaneously and finish together.
          const allDrained = servCodeIds.every((id) => (pools.get(id) ?? 0) <= 0);
          if (allDrained) {
            for (const servCodeId of servCodeIds) {
              if (projectedEndDate.get(servCodeId) === null) {
                projectedEndDate.set(servCodeId, day);
              }
            }
            timeline.push({ date: day, event: { kind: "finishes", entryLabel: label } });
            activeEmployeesByEntry.get(label)?.delete(employee.employeeId);
            recordServCodeEvent(label, day, employee.employeeId, "finishes");
          }

          break;
        }
      }

      // Record downtime
      if (workedEntryLabel === null) {
        if (prevEntryLabel !== null) {
          const prevActive = activeEmployeesByEntry.get(prevEntryLabel);
          if (prevActive) prevActive.delete(employee.employeeId);
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

  // Build servCodeId → groupLabel map from employee priority entries.
  // The label is already normalized (sorted) by the caller (paceCrawlerSelect),
  // but we guard here too in case the simulation is called directly.
  const servCodeGroupLabelMap = new Map<string, string>();
  for (const employee of employeeEntries) {
    for (const pe of employee.priorityEntries) {
      if (pe.kind === "group") {
        for (const servCodeId of pe.servCodeIds) {
          if (!servCodeGroupLabelMap.has(servCodeId)) {
            servCodeGroupLabelMap.set(servCodeId, pe.label);
          }
        }
      }
    }
  }

  const byServCode = new Map<string, CrawlerServCodeResult>();

  for (const entry of servCodeEntries) {
    const endDate = projectedEndDate.get(entry.servCodeId) ?? null;
    const optimizedMin = resolvedServCodeRangeMin.get(entry.servCodeId) ?? entry.servCodeRangeMin;
    const optimizedMax = endDate ?? entry.servCodeRangeMax;
    const groupLabel = servCodeGroupLabelMap.get(entry.servCodeId) ?? null;

    byServCode.set(entry.servCodeId, {
      servCodeId: entry.servCodeId,
      optimizedMin,
      projectedEndDate: endDate,
      optimizedMax,
      groupLabel,
    });
  }

  // Align group members' optimizedMin so all members share the same start date.
  // Rule: if a group contains a sequential servCode, its optimizedMin is authoritative
  // (it reflects the dynamically resolved unlock date from the crawl). For groups with
  // no sequential member, use the minimum optimizedMin across all members.
  const sequentialServCodeIds = new Set<string>();
  for (const entry of servCodeEntries) {
    if (entry.runsInSequence) sequentialServCodeIds.add(entry.servCodeId);
  }

  const groupMinMap = new Map<string, string>();

  // Pass 1: sequential members rule — their optimizedMin is the authoritative group start.
  for (const [servCodeId, groupLabel] of servCodeGroupLabelMap) {
    if (!sequentialServCodeIds.has(servCodeId)) continue;
    const result = byServCode.get(servCodeId);
    if (!result) continue;
    groupMinMap.set(groupLabel, result.optimizedMin);
  }

  // Pass 2: for groups with no sequential member, use the minimum optimizedMin.
  for (const [servCodeId, groupLabel] of servCodeGroupLabelMap) {
    if (groupMinMap.has(groupLabel)) continue; // already claimed by a sequential member
    const result = byServCode.get(servCodeId);
    if (!result) continue;
    const existing = groupMinMap.get(groupLabel);
    if (existing === undefined || result.optimizedMin < existing) {
      groupMinMap.set(groupLabel, result.optimizedMin);
    }
  }

  for (const [servCodeId, groupLabel] of servCodeGroupLabelMap) {
    const result = byServCode.get(servCodeId);
    const sharedMin = groupMinMap.get(groupLabel);
    if (!result || sharedMin === undefined) continue;
    byServCode.set(servCodeId, { ...result, optimizedMin: sharedMin });
  }

  return { byServCode, employeeTimeline, servCodeTimeline };
}
