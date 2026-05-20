import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { cascadeSelect } from "@/app/bizPlan/pace/selectors/cascadeSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { rawPaceSelect } from "@/app/bizPlan/pace/selectors/rawPaceSelect";
import { runDayCrawlSimulation } from "@/app/bizPlan/paceCrawler/_lib/dayCrawlSimulation";
import { DayCrawlServCodeEntry, DayCrawlEmployeeEntry, CrawlerResult } from "@/app/bizPlan/paceCrawler/PaceCrawlerTypes";
import { ServCodePaceDelta, ProgCodeProjectedCompletion, SeasonOptimizedRange } from "@/app/bizPlan/pace/PaceTypes";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";

// ---------------------------------------------------------------------------
// Layer 1 — Employee Availability
// ---------------------------------------------------------------------------

// Threshold: any schedDate more than 2 years out is almost certainly a RealGreen data error.
const TWO_YEARS_WEEKDAYS = 520;

/**
 * "When is each employee next available to work unscheduled jobs?"
 *
 * = nextWeekdayAfter(employee's latest printed schedDate across all servCodes)
 * = today if no printed services
 */
const selectNextDateByEmployee = createSelector(
  [deepSelect.servCodes, cascadeSelect.mainDate, assignmentPlanSelect.assignmentsByEmployeeId],
  (servCodes, today, assignmentsByEmployeeId): Map<string, string> => {
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
          const existing = latestPrintedByEmployee.get(service.lastAssigned.employeeId);
          if (!existing || schedDate > existing) {
            latestPrintedByEmployee.set(service.lastAssigned.employeeId, schedDate);
          }
        }
      }
    }

    const result = new Map<string, string>();

    // Seed from printed services — only for employees with assignments.
    for (const [employeeId, latestDate] of latestPrintedByEmployee) {
      const plan = assignmentsByEmployeeId.get(employeeId);
      if (plan && plan.servCodeIds.length > 0) {
        result.set(employeeId, dateStrings.nextWeekdayAfter(latestDate));
      }
    }

    // Ensure all assigned employees appear — those with no printed services get the next
    // weekday after today (routes are never created for today itself).
    for (const [employeeId, plan] of assignmentsByEmployeeId) {
      if (plan.servCodeIds.length > 0 && !result.has(employeeId)) {
        result.set(employeeId, dateStrings.nextWeekdayAfter(today));
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
 * = dateRange.min for all others (sequential N+1 floors are resolved dynamically in the crawl)
 *
 * ServCodes with no valid dateRange are excluded.
 */
const selectServCodeOpenDateFloor = createSelector(
  [progServSelect.progCodes, cascadeSelect.mainDate],
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
 * Extracted from cascadeSelect.employeeLookbackMap — price dimension only.
 * Map<employeeId, Map<programTypeKey, avgDailyPrice>>
 */
const selectEmployeeLookbackPriceMap = createSelector(
  [cascadeSelect.employeeLookbackMap],
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
// Layer 3b — Daily Rate by Employee by ServCode
// ---------------------------------------------------------------------------

/**
 * "What is each employee's daily price rate per servCode?"
 *
 * For each employee × servCode pair:
 * 1. Look up the employee's own lookback rate for the servCode's programType.
 * 2. If no own rate: use team average ÷ known-employee count as a fallback.
 *    Team = all employees assigned to this servCode (from servCode.assignedTo).
 *    Known = those with lookback data for this programType.
 * 3. If no team data at all: rate = 0 (employee contributes nothing to the crawl).
 *
 * Map<employeeId, Map<servCodeId, number>>
 */
const selectDailyRateByEmployeeByServCode = createSelector(
  [
    employeeSelect.employeeMap,
    selectEmployeeLookbackPriceMap,
    selectServCodeProgramTypeMap,
    progServSelect.servCodeMap,
  ],
  (employeeMap, lookbackPriceMap, programTypeMap, servCodeMap): Map<string, Map<string, number>> => {
    // Pre-compute team stats per servCode: sum of known rates + known count.
    // Only computed once and reused across all employees.
    const teamStatsByServCode = new Map<string, { teamTotal: number; knownCount: number }>();

    for (const servCode of servCodeMap.values()) {
      const programType = programTypeMap.get(servCode.servCodeId);
      if (!programType) continue;

      let teamTotal = 0;
      let knownCount = 0;
      for (const assignedEmployee of servCode.assignedTo) {
        const rate = lookbackPriceMap.get(assignedEmployee.employeeId)?.get(programType);
        if (rate != null && rate > 0) {
          teamTotal += rate;
          knownCount++;
        }
      }
      teamStatsByServCode.set(servCode.servCodeId, { teamTotal, knownCount });
    }

    const result = new Map<string, Map<string, number>>();

    for (const employee of employeeMap.values()) {
      if (employee.servCodeIds.length === 0) continue;

      const rateByServCode = new Map<string, number>();

      for (const servCodeId of employee.servCodeIds) {
        const programType = programTypeMap.get(servCodeId);
        if (!programType) continue;

        const ownRate = lookbackPriceMap.get(employee.employeeId)?.get(programType);

        if (ownRate != null && ownRate > 0) {
          rateByServCode.set(servCodeId, ownRate);
        } else {
          // Fallback: team average ÷ known count
          const teamStats = teamStatsByServCode.get(servCodeId);
          const fallback =
            teamStats && teamStats.knownCount > 0
              ? teamStats.teamTotal / teamStats.knownCount
              : 0;
          rateByServCode.set(servCodeId, fallback);
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
// Layer 4 — Active Pool Price by ServCode
// ---------------------------------------------------------------------------

/**
 * "How much unscheduled price remains per servCode?"
 *
 * = activeAsapCSP.price from rawPaceSelect (active + asap services, excludes printed)
 * Map<servCodeId, number>
 */
const selectActivePoolPriceByServCode = createSelector(
  [rawPaceSelect.rawServCodePacesPerDayMap],
  (perDayMap): Map<string, number> => {
    const result = new Map<string, number>();
    for (const [servCodeId, perDay] of perDayMap) {
      result.set(servCodeId, perDay.activeAsapCSP.price);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Layer 5 — Crawler Result
// ---------------------------------------------------------------------------

/**
 * "Run the day-crawl: when does each servCode's pool drain, and what are the proposed date ranges?"
 *
 * Assembles DayCrawlServCodeEntry[] and DayCrawlEmployeeEntry[] from layers 1–4,
 * then calls runDayCrawlSimulation.
 */
const selectCrawlerResult = createSelector(
  [
    selectNextDateByEmployee,
    selectServCodeOpenDateFloor,
    selectDailyRateByEmployeeByServCode,
    selectActivePoolPriceByServCode,
    employeeSelect.employeeMap,
    progServSelect.progCodes,
    cascadeSelect.mainDate,
  ],
  (
    nextDateByEmployee,
    openDateFloorMap,
    dailyRateMap,
    activePoolMap,
    employeeMap,
    progCodes,
    today,
  ): CrawlerResult => {
    // Build servCode entries
    const servCodeEntries: DayCrawlServCodeEntry[] = [];
    for (const progCode of progCodes) {
      for (const servCode of progCode.servCodes) {
        const floor = openDateFloorMap.get(servCode.servCodeId);
        if (!floor) continue; // excluded (no valid dateRange)

        const pool = activePoolMap.get(servCode.servCodeId) ?? 0;
        const currentMax = servCode.alwaysAsap ? today : (servCode.dateRange.max ?? today);

        servCodeEntries.push({
          servCodeId: servCode.servCodeId,
          progCodeId: progCode.progCodeId,
          runsInSequence: progCode.runsInSequence,
          openDateFloor: floor,
          pool,
          paddingDays: servCode.paddingDays,
          currentMax,
        });
      }
    }

    // Build employee entries — only assigned employees
    const employeeEntries: DayCrawlEmployeeEntry[] = [];
    for (const employee of employeeMap.values()) {
      if (employee.servCodeIds.length === 0) continue;

      const dailyRates = dailyRateMap.get(employee.employeeId) ?? new Map<string, number>();
      const nextAvailableDate = nextDateByEmployee.get(employee.employeeId) ?? dateStrings.nextWeekdayAfter(today);

      employeeEntries.push({
        employeeId: employee.employeeId,
        servCodeIds: employee.servCodeIds,
        dailyRates,
        nextAvailableDate,
      });
    }

    return runDayCrawlSimulation(servCodeEntries, employeeEntries, today);
  },
);

// ---------------------------------------------------------------------------
// Layer 6 — Derived Outputs
// ---------------------------------------------------------------------------

/**
 * "How many days ahead/behind is each servCode projected to finish vs its planned dateRange.max?"
 *
 * deltaDays > 0 = behind schedule, < 0 = ahead.
 * deltaDaysCSP = null (price-only for now).
 */
const selectServCodeDeltaMap = createSelector(
  [selectCrawlerResult, selectActivePoolPriceByServCode, progServSelect.servCodes],
  (crawlerResult, activePoolMap, servCodes): Map<string, ServCodePaceDelta> => {
    const result = new Map<string, ServCodePaceDelta>();

    for (const servCode of servCodes) {
      const servCodeId = servCode.servCodeId;
      const crawled = crawlerResult.byServCode.get(servCodeId);
      const pool = activePoolMap.get(servCodeId) ?? 0;
      const projectedEndDate = crawled?.projectedEndDate ?? null;
      const dateRange = servCode.dateRange;

      const deltaDays =
        projectedEndDate != null && pool > 0 && dateRange.max
          ? dateRanges.weekdaysBetween(dateRange.max, projectedEndDate)
          : null;

      result.set(servCodeId, {
        servCodeId,
        dateRange,
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
 * Falls back to dateRange.max with isEstimated = true when projectedEndDate is null.
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
 */
const selectSeasonOptimizerResult = createSelector(
  [selectCrawlerResult, selectActivePoolPriceByServCode, progServSelect.progCodes, cascadeSelect.mainDate],
  (crawlerResult, activePoolMap, progCodes, today): SeasonOptimizedRange[] => {
    const results: SeasonOptimizedRange[] = [];

    for (const progCode of progCodes) {
      for (const servCode of progCode.servCodes) {
        const servCodeId = servCode.servCodeId;
        const crawled = crawlerResult.byServCode.get(servCodeId);
        const pool = activePoolMap.get(servCodeId) ?? 0;
        const hasWork = pool > 0;

        const resolvedFloor = crawled?.resolvedOpenDateFloor ?? servCode.dateRange.min ?? today;
        const isStarted = resolvedFloor <= today;

        results.push({
          servCodeId,
          progCodeId: progCode.progCodeId,
          servCodeName: servCode.longName,
          currentRange: servCode.dateRange,
          proposedMin: crawled?.proposedMin ?? servCode.dateRange.min ?? today,
          proposedMax: crawled?.proposedMax ?? servCode.dateRange.max ?? today,
          projectedEndDate: crawled?.projectedEndDate ?? null,
          paddingDays: servCode.paddingDays,
          runsInSequence: progCode.runsInSequence,
          isStarted,
          hasWork,
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
// Single export
// ---------------------------------------------------------------------------

export const paceCrawlerSelect = {
  // Layer 1
  nextDateByEmployee: selectNextDateByEmployee,
  // Layer 2
  servCodeOpenDateFloor: selectServCodeOpenDateFloor,
  servCodeProgramTypeMap: selectServCodeProgramTypeMap,
  // Layer 3a
  employeeLookbackPriceMap: selectEmployeeLookbackPriceMap,
  // Layer 3b
  dailyRateByEmployeeByServCode: selectDailyRateByEmployeeByServCode,
  // Layer 4
  activePoolPriceByServCode: selectActivePoolPriceByServCode,
  // Layer 5
  crawlerResult: selectCrawlerResult,
  // Layer 6
  servCodeDeltaMap: selectServCodeDeltaMap,
  progCodeProjectedCompletionMap: selectProgCodeProjectedCompletionMap,
  seasonOptimizerResult: selectSeasonOptimizerResult,
  // Layer 6b
  employeeTimelineMap: selectEmployeeTimelineMap,
};
