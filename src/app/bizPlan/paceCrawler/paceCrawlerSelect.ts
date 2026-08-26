import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { assignmentGroupSelect } from "@/app/assignmentGroup/assignmentGroupSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { paceCrawlerLookbackSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerLookbackSelect";
import { seasonPlanSelect } from "@/app/bizPlan/seasonPlan/seasonPlanSelect";
import { runDayCrawlSimulation } from "@/app/bizPlan/paceCrawler/_lib/dayCrawlSimulation";
import {
  DayCrawlPriorityEntry,
  DayCrawlEmployeeEntry,
  CrawlerResult,
  ProgCodeProjectedCompletion,
  ServCodePaceDelta,
  SeasonOptimizedRange,
} from "@/app/bizPlan/paceCrawler/PaceCrawlerTypes";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { holidaySelect } from "@/app/holiday/holidaySelect";

// ---------------------------------------------------------------------------
// Slice selector
// ---------------------------------------------------------------------------

const selectMainDate = (state: AppState): string => state.paceCrawler.mainDate;

const selectAssignmentEditorSelectedEmployeeIds = (state: AppState): string[] =>
  state.paceCrawler.assignmentEditorSelectedEmployeeIds;

// ---------------------------------------------------------------------------
// Layer 0 — Crawl Start Date
// ---------------------------------------------------------------------------

/**
 * "What is the first day the crawl should simulate?"
 *
 * If mainDate is a future planning date, the crawl starts on mainDate itself.
 * If mainDate is today or in the past, the crawl starts on the next weekday after actual today
 * (routes are never created for today itself — the crawl only projects future work).
 *
 * Note: dateStrings.today() is called inside the selector computation. It is not derived
 * from Redux state, but it is stable within a render cycle and correct at selector evaluation time.
 */
const selectCrawlStart = createSelector(
  [selectMainDate],
  (mainDate): string => {
    const actualToday = dateStrings.today();
    return mainDate > actualToday ? mainDate : dateStrings.nextWeekdayAfter(actualToday);
  },
);

// ---------------------------------------------------------------------------
// Layer 1 — Employee Availability
// ---------------------------------------------------------------------------

// Threshold: any schedDate more than 2 years out is almost certainly a RealGreen data error.
const TWO_YEARS_WEEKDAYS = 520;

/**
 * "When is each employee next available to work unscheduled jobs?"
 *
 * = nextWeekdayAfter(employee's latest printed schedDate across all servCodes)
 * = crawlStart if no printed services
 */
const selectNextDateByEmployee = createSelector(
  [
    deepSelect.servCodes,
    selectMainDate,
    selectCrawlStart,
    assignmentPlanSelect.assignmentsByEmployeeId,
  ],
  (servCodes, today, crawlStart, assignmentsByEmployeeId): Map<string, string> => {
    const twoYearsOut = dateStrings.addWeekdays(today, TWO_YEARS_WEEKDAYS);
    const latestPrintedByEmployee = new Map<string, string>();

    for (const servCode of servCodes) {
      for (const service of servCode.services) {
        if (
          service.status === "$" &&
          service.lastAssigned.schedDate &&
          service.lastAssigned.employeeId
        ) {
          const schedDate = service.lastAssigned.schedDate;
          if (schedDate > twoYearsOut) continue; // guard against data errors
          const existing = latestPrintedByEmployee.get(
            service.lastAssigned.employeeId,
          );
          if (!existing || schedDate > existing) {
            latestPrintedByEmployee.set(
              service.lastAssigned.employeeId,
              schedDate,
            );
          }
        }
      }
    }

    const result = new Map<string, string>();

    // Seed from printed services — only for employees with assignments.
    for (const [employeeId, latestDate] of latestPrintedByEmployee) {
      const plan = assignmentsByEmployeeId.get(employeeId);
      if (plan && plan.groupAssignments.length > 0) {
        result.set(employeeId, dateStrings.nextWeekdayAfter(latestDate));
      }
    }

    // Ensure all assigned employees appear — those with no printed services get the crawl start.
    for (const [employeeId, plan] of assignmentsByEmployeeId) {
      if (plan.groupAssignments.length > 0 && !result.has(employeeId)) {
        result.set(employeeId, crawlStart);
      }
    }

    return result;
  },
);

// ---------------------------------------------------------------------------
// Layer 2 — ServCode Open Date Floors + ProgramType Map
// ---------------------------------------------------------------------------

const NULL_PROGRAM_TYPE_KEY = "__null__";

/**
 * "What is each servCode's static open date floor?"
 *
 * = today for alwaysAsap servCodes
 * = servCode.dateRange.min for all others (sequential N+1 floors are resolved dynamically in the crawl)
 *
 * ServCodes with no valid dateRange are excluded.
 */
const selectServCodeOpenDateFloor = createSelector(
  [progServSelect.progCodes, selectMainDate],
  (progCodes, today): Map<string, string> => {
    const result = new Map<string, string>();
    for (const progCode of progCodes) {
      for (const servCode of progCode.servCodes) {
        if (servCode.alwaysAsap) {
          result.set(servCode.servCodeId, today);
        } else if (dateRanges.isValidDateRange(servCode.dateRange)) {
          result.set(servCode.servCodeId, servCode.dateRange.min);
        }
        // ServCodes with no valid dateRange are excluded — they cannot be crawled.
      }
    }
    return result;
  },
);

/**
 * "What programType does each servCode belong to?"
 *
 * = progCode.programType ?? "__null__" (sentinel for null programType in Maps)
 */
const selectServCodeProgramTypeMap = createSelector(
  [progServSelect.progCodes],
  (progCodes): Map<string, string> => {
    const result = new Map<string, string>();
    for (const progCode of progCodes) {
      const programTypeKey = progCode.programType ?? NULL_PROGRAM_TYPE_KEY;
      for (const servCode of progCode.servCodes) {
        result.set(servCode.servCodeId, programTypeKey);
      }
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Layer 3a — Employee Lookback Price Map
// ---------------------------------------------------------------------------

/**
 * "What is each employee's avg daily price per programType?"
 *
 * Extracted from paceCrawlerLookbackSelect.employeeLookbackMap — price dimension only.
 * Map<employeeId, Map<programTypeKey, avgDailyPrice>>
 */
const selectEmployeeLookbackPriceMap = createSelector(
  [paceCrawlerLookbackSelect.employeeLookbackMap],
  (lookbackMap): Map<string, Map<string, number>> => {
    const result = new Map<string, Map<string, number>>();
    for (const [employeeId, byProgramType] of lookbackMap) {
      const priceMap = new Map<string, number>();
      for (const [programTypeKey, stats] of byProgramType) {
        if (stats != null && stats.avgDailyCSP.price > 0) {
          priceMap.set(programTypeKey, stats.avgDailyCSP.price);
        }
      }
      if (priceMap.size > 0) result.set(employeeId, priceMap);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Layer 3b — Total Avg Daily Price by Employee
// ---------------------------------------------------------------------------

/**
 * "What is each employee's total avg daily price across all programTypes?"
 *
 * = totalAvgDailyCSP.price from any programType entry in the lookback map
 * (totalAvgDailyCSP is the same across all programType entries for a given employee)
 *
 * Used as the drain rate for group entries — full daily capacity.
 * Map<employeeId, number>
 */
const selectTotalAvgDailyPriceByEmployee = createSelector(
  [paceCrawlerLookbackSelect.employeeLookbackMap],
  (lookbackMap): Map<string, number> => {
    const result = new Map<string, number>();
    for (const [employeeId, byProgramType] of lookbackMap) {
      for (const stats of byProgramType.values()) {
        if (stats != null && stats.totalAvgDailyCSP.price > 0) {
          result.set(employeeId, stats.totalAvgDailyCSP.price);
          break; // totalAvgDailyCSP is the same across all programType entries
        }
      }
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Layer 3b.5 — Team Average Total Daily Price (fallback for new employees)
// ---------------------------------------------------------------------------

/**
 * "What is the team's average total daily price?"
 *
 * = average of totalAvgDailyPriceByEmployee across all employees with data.
 * Used as a fallback for employees with no lookback history (e.g. new hires).
 * Returns 0 if no employees have data.
 */
const selectTeamAvgTotalDailyPrice = createSelector(
  [selectTotalAvgDailyPriceByEmployee],
  (totalAvgMap): number => {
    if (totalAvgMap.size === 0) return 0;
    let sum = 0;
    for (const price of totalAvgMap.values()) {
      sum += price;
    }
    return sum / totalAvgMap.size;
  },
);

// ---------------------------------------------------------------------------
// Layer 3c — Daily Rate by Employee by ServCode
// ---------------------------------------------------------------------------

/**
 * "What is each employee's daily price rate per servCode?"
 *
 * Fallback chain for each employee × servCode pair:
 * 1. Employee's own lookback rate for the servCode's programType.
 * 2. Team average for this servCode's assignedTo list (employees RealGreen has assigned).
 * 3. Team average across ALL employees with lookback data for this programType
 *    (handles servCodes where assignedTo is empty or contains only new employees).
 * 4. teamAvgTotalDailyPrice — last resort cross-programType fallback.
 *
 * Map<employeeId, Map<servCodeId, number>>
 */
const selectDailyRateByEmployeeByServCode = createSelector(
  [
    employeeSelect.employeeMap,
    selectEmployeeLookbackPriceMap,
    selectServCodeProgramTypeMap,
    selectTeamAvgTotalDailyPrice,
    progServSelect.servCodeMap,
  ],
  (
    employeeMap,
    lookbackPriceMap,
    programTypeMap,
    teamAvgTotalDailyPrice,
    servCodeMap,
  ): Map<string, Map<string, number>> => {
    // Pre-compute team stats per servCode (from assignedTo list).
    const teamStatsByServCode = new Map<
      string,
      { teamTotal: number; knownCount: number }
    >();

    for (const servCode of servCodeMap.values()) {
      const programType = programTypeMap.get(servCode.servCodeId);
      if (!programType) continue;

      let teamTotal = 0;
      let knownCount = 0;
      for (const assignedEmployee of servCode.assignedTo) {
        const rate = lookbackPriceMap
          .get(assignedEmployee.employeeId)
          ?.get(programType);
        if (rate != null && rate > 0) {
          teamTotal += rate;
          knownCount++;
        }
      }
      teamStatsByServCode.set(servCode.servCodeId, { teamTotal, knownCount });
    }

    // Pre-compute team stats per programType across ALL employees with lookback data.
    const teamStatsByProgramType = new Map<
      string,
      { teamTotal: number; knownCount: number }
    >();

    for (const [, byProgramType] of lookbackPriceMap) {
      for (const [programType, rate] of byProgramType) {
        if (rate > 0) {
          const existing = teamStatsByProgramType.get(programType) ?? {
            teamTotal: 0,
            knownCount: 0,
          };
          teamStatsByProgramType.set(programType, {
            teamTotal: existing.teamTotal + rate,
            knownCount: existing.knownCount + 1,
          });
        }
      }
    }

    const result = new Map<string, Map<string, number>>();

    for (const employee of employeeMap.values()) {
      if (employee.servCodeIds.length === 0) continue;

      const rateByServCode = new Map<string, number>();

      for (const servCodeId of employee.servCodeIds) {
        const programType = programTypeMap.get(servCodeId);
        if (!programType) continue;

        const ownRate = lookbackPriceMap
          .get(employee.employeeId)
          ?.get(programType);

        if (ownRate != null && ownRate > 0) {
          // Step 1: own lookback rate
          rateByServCode.set(servCodeId, ownRate);
        } else {
          const servCodeStats = teamStatsByServCode.get(servCodeId);
          if (servCodeStats && servCodeStats.knownCount > 0) {
            // Step 2: team avg from servCode's assignedTo list
            rateByServCode.set(
              servCodeId,
              servCodeStats.teamTotal / servCodeStats.knownCount,
            );
          } else {
            const ptStats = teamStatsByProgramType.get(programType);
            if (ptStats && ptStats.knownCount > 0) {
              // Step 3: team avg across all employees for this programType
              rateByServCode.set(
                servCodeId,
                ptStats.teamTotal / ptStats.knownCount,
              );
            } else {
              // Step 4: cross-programType team avg (last resort)
              rateByServCode.set(servCodeId, teamAvgTotalDailyPrice);
            }
          }
        }
      }

      if (rateByServCode.size > 0) {
        result.set(employee.employeeId, rateByServCode);
      }
    }

    return result;
  },
);

// ---------------------------------------------------------------------------
// Layer 4 — Active Pool Price by ServCode + Total Pool by ServCode
// ---------------------------------------------------------------------------

/**
 * "How much unscheduled price remains per servCode?"
 *
 * = sum of price for actionable services (active + asap, excludes printed)
 * Map<servCodeId, number>
 */
const selectActivePoolPriceByServCode = createSelector(
  [deepSelect.servCodes],
  (servCodes): Map<string, number> => {
    const result = new Map<string, number>();
    for (const servCode of servCodes) {
      const activePoolServices = servCode.services.filter((s) => s.x.isActionable);
      result.set(
        servCode.servCodeId,
        activePoolServices.reduce((total, service) => total + service.price, 0),
      );
    }
    return result;
  },
);

/**
 * "What is the total pool (completed + remaining) per servCode?"
 *
 * = sum of price for all services where status !== "N" (never)
 * Used to compute completionPct for cascade unlock.
 * completionPct = 1 - (activePool / totalPool)
 * Map<servCodeId, number>
 */
const selectTotalPoolPriceByServCode = createSelector(
  [deepSelect.servCodes],
  (servCodes): Map<string, number> => {
    const result = new Map<string, number>();
    for (const servCode of servCodes) {
      // Include completed (S), active (Y), asap (*), printed ($) — exclude never (N) and skips
      const totalServices = servCode.services.filter(
        (s) => s.status !== "N" && !s.status.match(/^[A-Z]$/) || s.status === "S" || s.status === "Y" || s.status === "*" || s.status === "$",
      );
      result.set(
        servCode.servCodeId,
        totalServices.reduce((total, service) => total + service.price, 0),
      );
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Layer 5 — Crawler Result
// ---------------------------------------------------------------------------

/**
 * "Run the day-crawl: when does each servCode's pool drain, and what are the optimized date ranges?"
 *
 * Assembles DayCrawlServCodeEntry[] and DayCrawlEmployeeEntry[] from layers 1–4,
 * then calls runDayCrawlSimulation.
 *
 * Each employee's groupAssignments are resolved to DayCrawlPriorityEntry[] via groupMap.
 * Falls back to splitting groupId on "+" if the group isn't in groupMap yet.
 *
 * Cascade unlock uses completionPct >= cascadeThreshold OR today > plannedEnd.
 *
 * timeOffDates per employee = personal PTO dates ∪ global holiday dates.
 */
const selectCrawlerResult = createSelector(
  [
    selectNextDateByEmployee,
    selectServCodeOpenDateFloor,
    selectDailyRateByEmployeeByServCode,
    selectActivePoolPriceByServCode,
    selectTotalPoolPriceByServCode,
    selectTotalAvgDailyPriceByEmployee,
    selectTeamAvgTotalDailyPrice,
    employeeSelect.employeeMap,
    assignmentPlanSelect.assignmentsByEmployeeId,
    assignmentGroupSelect.groupMap,
    progServSelect.progCodes,
    selectMainDate,
    selectCrawlStart,
    holidaySelect.holidayDates,
    seasonPlanSelect.servCodeScheduleMap,
    seasonPlanSelect.cascadeThreshold,
  ],
  (
    nextDateByEmployee,
    openDateFloorMap,
    dailyRateMap,
    activePoolMap,
    totalPoolMap,
    totalAvgDailyPriceMap,
    teamAvgTotalDailyPrice,
    employeeMap,
    assignmentsByEmployeeId,
    groupMap,
    progCodes,
    today,
    crawlStart,
    holidayDates,
    servCodeScheduleMap,
    cascadeThreshold,
  ): CrawlerResult => {
    // Build servCode entries
    const servCodeEntries = [];
    for (const progCode of progCodes) {
      for (const servCode of progCode.servCodes) {
        const floor = openDateFloorMap.get(servCode.servCodeId);
        if (!floor) continue; // excluded (no valid dateRange)

        const pool = activePoolMap.get(servCode.servCodeId) ?? 0;
        const totalPool = totalPoolMap.get(servCode.servCodeId) ?? pool;
        const servCodeRangeMax = servCode.alwaysAsap
          ? today
          : (servCode.dateRange.max ?? today);
        const schedule = servCodeScheduleMap.get(servCode.servCodeId);

        servCodeEntries.push({
          servCodeId: servCode.servCodeId,
          progCodeId: progCode.progCodeId,
          runsInSequence: progCode.runsInSequence,
          servCodeRangeMin: floor,
          pool,
          totalPool,
          servCodeRangeMax,
          plannedEnd: schedule?.plannedEnd ?? null,
        });
      }
    }

    // Build employee entries — resolve each groupAssignment to a DayCrawlPriorityEntry
    const employeeEntries: DayCrawlEmployeeEntry[] = [];
    for (const [employeeId, plan] of assignmentsByEmployeeId) {
      if (plan.groupAssignments.length === 0) continue;

      const employee = employeeMap.get(employeeId);
      if (!employee) continue;

      const priorityEntries: DayCrawlPriorityEntry[] = plan.groupAssignments.map(({ groupId }) => {
        const group = groupMap.get(groupId);
        // Fall back to splitting groupId on "+" if group not yet loaded
        const servCodeIds = group?.servCodeIds ?? groupId.split("+");
        return {
          groupId,
          label: group?.label ?? groupId,
          servCodeIds,
        };
      });

      const dailyRates =
        dailyRateMap.get(employeeId) ?? new Map<string, number>();

      // Drain rate: use the employee's goal for this group if set, otherwise fall back to lookback avg.
      // Use the first group's goal as the employee's total drain rate.
      const firstGroupGoal = plan.groupAssignments[0]?.dailyRevenueGoal ?? null;
      const totalAvgDailyPrice =
        firstGroupGoal !== null
          ? firstGroupGoal
          : (totalAvgDailyPriceMap.get(employeeId) ?? teamAvgTotalDailyPrice);
      const nextAvailableDate =
        nextDateByEmployee.get(employeeId) ?? crawlStart;

      // Build timeOffDates: personal PTO dates ∪ global holiday dates
      const timeOffDates = new Set<string>(holidayDates);
      for (const pto of employee.plannedTimeOff) {
        let ptoDay = pto.dateRange.min;
        while (ptoDay <= pto.dateRange.max) {
          if (dateStrings.isWeekDay(ptoDay)) timeOffDates.add(ptoDay);
          ptoDay = dateStrings.addDays(ptoDay, 1);
        }
      }

      employeeEntries.push({
        employeeId,
        priorityEntries,
        dailyRates,
        totalAvgDailyPrice,
        nextAvailableDate,
        timeOffDates,
      });
    }

    return runDayCrawlSimulation(servCodeEntries, employeeEntries, crawlStart, cascadeThreshold);
  },
);

// ---------------------------------------------------------------------------
// Layer 6 — Derived Outputs
// ---------------------------------------------------------------------------

/**
 * "How many days ahead/behind is each servCode projected to finish vs its servCode dateRange.max?"
 *
 * deltaDays > 0 = behind schedule, < 0 = ahead.
 * deltaDaysCSP = null (price-only for now).
 */
const selectServCodeDeltaMap = createSelector(
  [
    selectCrawlerResult,
    selectActivePoolPriceByServCode,
    progServSelect.servCodes,
  ],
  (crawlerResult, activePoolMap, servCodes): Map<string, ServCodePaceDelta> => {
    const result = new Map<string, ServCodePaceDelta>();

    for (const servCode of servCodes) {
      const servCodeId = servCode.servCodeId;
      const crawled = crawlerResult.byServCode.get(servCodeId);
      const pool = activePoolMap.get(servCodeId) ?? 0;
      const projectedEndDate = crawled?.projectedEndDate ?? null;
      const servCodeRange = servCode.dateRange;

      const deltaDays =
        projectedEndDate != null && pool > 0 && servCodeRange.max
          ? dateRanges.weekdaysBetween(servCodeRange.max, projectedEndDate)
          : null;

      result.set(servCodeId, {
        servCodeId,
        servCodeRange,
        projectedEndDate,
        deltaDays,
        deltaDaysCSP: null,
      } satisfies ServCodePaceDelta);
    }

    return result;
  },
);

/**
 * "When will each program be fully done?"
 *
 * = latest projectedEndDate across all servCodes in the progCode.
 * Falls back to servCodeRange.max with isEstimated = true when projectedEndDate is null.
 */
const selectProgCodeProjectedCompletionMap = createSelector(
  [selectCrawlerResult, progServSelect.progCodes],
  (crawlerResult, progCodes): Map<string, ProgCodeProjectedCompletion> => {
    const result = new Map<string, ProgCodeProjectedCompletion>();

    for (const progCode of progCodes) {
      const dates: string[] = [];
      let anyEstimated = false;

      for (const servCode of progCode.servCodes) {
        const crawled = crawlerResult.byServCode.get(servCode.servCodeId);
        if (crawled?.projectedEndDate != null) {
          dates.push(crawled.projectedEndDate);
        } else if (servCode.dateRange.max) {
          anyEstimated = true;
          dates.push(servCode.dateRange.max);
        }
      }

      result.set(progCode.progCodeId, {
        date: dates.length > 0 ? [...dates].sort().at(-1)! : null,
        isEstimated: anyEstimated,
      });
    }

    return result;
  },
);

/**
 * "What should the date ranges be, given current throughput and work pools?"
 *
 * One SeasonOptimizedRange per servCode, built from crawlerResult.
 * Includes plannedEnd from the active SeasonPlan for Gantt rendering.
 */
const selectSeasonOptimizerResult = createSelector(
  [
    selectCrawlerResult,
    selectActivePoolPriceByServCode,
    progServSelect.progCodes,
    selectMainDate,
    seasonPlanSelect.servCodeScheduleMap,
  ],
  (crawlerResult, activePoolMap, progCodes, today, servCodeScheduleMap): SeasonOptimizedRange[] => {
    const results: SeasonOptimizedRange[] = [];

    for (const progCode of progCodes) {
      for (const servCode of progCode.servCodes) {
        const servCodeId = servCode.servCodeId;
        const crawled = crawlerResult.byServCode.get(servCodeId);
        const pool = activePoolMap.get(servCodeId) ?? 0;
        const hasWork = pool > 0;
        const schedule = servCodeScheduleMap.get(servCodeId);

        const resolvedMin =
          crawled?.optimizedMin ?? servCode.dateRange.min ?? today;
        const isStarted = resolvedMin <= today;

        results.push({
          servCodeId,
          progCodeId: progCode.progCodeId,
          servCodeName: servCode.longName,
          servCodeRange: servCode.dateRange,
          optimizedMin:
            crawled?.optimizedMin ?? servCode.dateRange.min ?? today,
          optimizedMax:
            crawled?.optimizedMax ?? servCode.dateRange.max ?? today,
          projectedEndDate: crawled?.projectedEndDate ?? null,
          runsInSequence: progCode.runsInSequence,
          isStarted,
          hasWork,
          plannedEnd: schedule?.plannedEnd ?? null,
        } satisfies SeasonOptimizedRange);
      }
    }

    return results;
  },
);

// ---------------------------------------------------------------------------
// Layer 6b — Employee Timeline Map
// ---------------------------------------------------------------------------

/**
 * "What is each employee doing on each significant date?"
 *
 * Extracted directly from crawlerResult.employeeTimeline — no additional computation.
 * Map<employeeId, { date: string; event: EmployeeTimelineEvent }[]>
 */
const selectEmployeeTimelineMap = createSelector(
  [selectCrawlerResult],
  (crawlerResult) => crawlerResult.employeeTimeline,
);

// ---------------------------------------------------------------------------
// Layer 6c — ServCode Timeline Map
// ---------------------------------------------------------------------------

/**
 * "Who is working each servCode/group, and when does the crew change?"
 *
 * Extracted directly from crawlerResult.servCodeTimeline — no additional computation.
 * Map<entryLabel, ServCodeTimelineEvent[]>
 */
const selectServCodeTimelineMap = createSelector(
  [selectCrawlerResult],
  (crawlerResult) => crawlerResult.servCodeTimeline,
);

// ---------------------------------------------------------------------------
// Single export
// ---------------------------------------------------------------------------

export const paceCrawlerSelect = {
  // Slice selectors
  mainDate: selectMainDate,
  assignmentEditorSelectedEmployeeIds: selectAssignmentEditorSelectedEmployeeIds,
  // Layer 0
  crawlStart: selectCrawlStart,
  // Layer 1
  nextDateByEmployee: selectNextDateByEmployee,
  // Layer 2
  servCodeOpenDateFloor: selectServCodeOpenDateFloor,
  servCodeProgramTypeMap: selectServCodeProgramTypeMap,
  // Layer 3a
  employeeLookbackPriceMap: selectEmployeeLookbackPriceMap,
  // Layer 3b
  totalAvgDailyPriceByEmployee: selectTotalAvgDailyPriceByEmployee,
  // Layer 3b.5
  teamAvgTotalDailyPrice: selectTeamAvgTotalDailyPrice,
  // Layer 3c
  dailyRateByEmployeeByServCode: selectDailyRateByEmployeeByServCode,
  // Layer 4
  activePoolPriceByServCode: selectActivePoolPriceByServCode,
  totalPoolPriceByServCode: selectTotalPoolPriceByServCode,
  // Layer 5
  crawlerResult: selectCrawlerResult,
  // Layer 6
  servCodeDeltaMap: selectServCodeDeltaMap,
  progCodeProjectedCompletionMap: selectProgCodeProjectedCompletionMap,
  seasonOptimizerResult: selectSeasonOptimizerResult,
  // Layer 6b
  employeeTimelineMap: selectEmployeeTimelineMap,
  // Layer 6c
  servCodeTimelineMap: selectServCodeTimelineMap,
};
