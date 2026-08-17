import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { assignmentSelect } from "@/app/assignment/assignmentSelect";
import { TimeCard } from "@/app/timeCard/TimeCard";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { Punch } from "@/app/timeCard/TimeCardTypes";

// ---------------------------------------------------------------------------
// ProductivityTotals — the core metric shape for all aggregations.
// ---------------------------------------------------------------------------

export type ProductivityTotals = {
  /** 1 per service per employee who touched it — "how many stops did this tech make?" */
  wholeCount: number;
  /** sum of percent per doneBy — "how much of each service did this tech own?" */
  fractionalCount: number;
  /** service.size * percent */
  size: number;
  /** service.x.getPriceAfterDiscounts("price") * percent */
  revenue: number;
};

const emptyTotals = (): ProductivityTotals => ({
  wholeCount: 0,
  fractionalCount: 0,
  size: 0,
  revenue: 0,
});

// ---------------------------------------------------------------------------
// Source selectors
// ---------------------------------------------------------------------------

const selectDoneDateRange = (state: AppState) => state.productivity.doneDateRange;

const selectPunches = (state: AppState) => state.timeCard.docs;

// ---------------------------------------------------------------------------
// Completed services in range
// ---------------------------------------------------------------------------

const selectCompletedServices = createSelector(
  [centralSelect.services, selectDoneDateRange],
  (services, doneDateRange): Service[] => {
    if (!dateRanges.isValidDateRange(doneDateRange)) return [];
    return services.filter((service) => {
      if (service.status !== "S") return false;
      const doneDate = service.x.doneDate;
      if (!doneDate) return false;
      return doneDate >= doneDateRange.min && doneDate <= doneDateRange.max;
    });
  },
);

// ---------------------------------------------------------------------------
// Helper: accumulate totals from a service's doneBys into a totals object
// ---------------------------------------------------------------------------

function accumulateTotals(
  totals: ProductivityTotals,
  service: Service,
): void {
  const doneBys = service.production?.doneBys ?? [];
  const revenue = service.x.getPriceAfterDiscounts("price");

  for (const doneBy of doneBys) {
    totals.wholeCount += 1;
    totals.fractionalCount += doneBy.percent;
    totals.size += service.size * doneBy.percent;
    totals.revenue += revenue * doneBy.percent;
  }
}

// ---------------------------------------------------------------------------
// Overall totals
// ---------------------------------------------------------------------------

const selectTotals = createSelector(
  [selectCompletedServices],
  (services): ProductivityTotals => {
    const totals = emptyTotals();
    for (const service of services) {
      accumulateTotals(totals, service);
    }
    return totals;
  },
);

// ---------------------------------------------------------------------------
// By employee
// ---------------------------------------------------------------------------

const selectByEmployee = createSelector(
  [selectCompletedServices],
  (services): Map<string, ProductivityTotals> => {
    const map = new Map<string, ProductivityTotals>();
    for (const service of services) {
      const doneBys = service.production?.doneBys ?? [];
      const revenue = service.x.getPriceAfterDiscounts("price");
      for (const doneBy of doneBys) {
        const existing = map.get(doneBy.employeeId) ?? emptyTotals();
        existing.wholeCount += 1;
        existing.fractionalCount += doneBy.percent;
        existing.size += service.size * doneBy.percent;
        existing.revenue += revenue * doneBy.percent;
        map.set(doneBy.employeeId, existing);
      }
    }
    return map;
  },
);

// ---------------------------------------------------------------------------
// By employee by date
// ---------------------------------------------------------------------------

const selectByEmployeeByDate = createSelector(
  [selectCompletedServices],
  (services): Map<string, Map<string, ProductivityTotals>> => {
    const map = new Map<string, Map<string, ProductivityTotals>>();
    for (const service of services) {
      const doneDate = service.x.doneDate ?? "";
      const doneBys = service.production?.doneBys ?? [];
      const revenue = service.x.getPriceAfterDiscounts("price");
      for (const doneBy of doneBys) {
        let byDate = map.get(doneBy.employeeId);
        if (!byDate) {
          byDate = new Map<string, ProductivityTotals>();
          map.set(doneBy.employeeId, byDate);
        }
        const existing = byDate.get(doneDate) ?? emptyTotals();
        existing.wholeCount += 1;
        existing.fractionalCount += doneBy.percent;
        existing.size += service.size * doneBy.percent;
        existing.revenue += revenue * doneBy.percent;
        byDate.set(doneDate, existing);
      }
    }
    return map;
  },
);

// ---------------------------------------------------------------------------
// By date by employee
// ---------------------------------------------------------------------------

const selectByDateByEmployee = createSelector(
  [selectCompletedServices],
  (services): Map<string, Map<string, ProductivityTotals>> => {
    const map = new Map<string, Map<string, ProductivityTotals>>();
    for (const service of services) {
      const doneDate = service.x.doneDate ?? "";
      const doneBys = service.production?.doneBys ?? [];
      const revenue = service.x.getPriceAfterDiscounts("price");
      for (const doneBy of doneBys) {
        let byEmployee = map.get(doneDate);
        if (!byEmployee) {
          byEmployee = new Map<string, ProductivityTotals>();
          map.set(doneDate, byEmployee);
        }
        const existing = byEmployee.get(doneBy.employeeId) ?? emptyTotals();
        existing.wholeCount += 1;
        existing.fractionalCount += doneBy.percent;
        existing.size += service.size * doneBy.percent;
        existing.revenue += revenue * doneBy.percent;
        byEmployee.set(doneBy.employeeId, existing);
      }
    }
    return map;
  },
);

// ---------------------------------------------------------------------------
// Assignment completion by employee
// ---------------------------------------------------------------------------

const selectAssignmentCompletionByEmployee = createSelector(
  [selectCompletedServices, assignmentSelect.assignmentsByEmployeeForRange],
  (completedServices, assignmentsByEmployee): Map<string, { assigned: number; completed: number; pct: number }> => {
    const map = new Map<string, { assigned: number; completed: number; pct: number }>();

    // Build a set of (employeeId, doneDate) → servIds completed by that employee on that date
    const completedByEmployeeDate = new Map<string, Set<number>>();
    for (const service of completedServices) {
      const doneDate = service.x.doneDate ?? "";
      const doneBys = service.production?.doneBys ?? [];
      for (const doneBy of doneBys) {
        const key = `${doneBy.employeeId}|${doneDate}`;
        const existing = completedByEmployeeDate.get(key) ?? new Set<number>();
        existing.add(service.servId);
        completedByEmployeeDate.set(key, existing);
      }
    }

    // For each employee in the assignment range, count assigned vs completed
    for (const [employeeId, assignments] of assignmentsByEmployee) {
      let assigned = 0;
      let completed = 0;
      for (const assignment of assignments) {
        assigned++;
        const key = `${employeeId}|${assignment.schedDate}`;
        const completedServIds = completedByEmployeeDate.get(key);
        if (completedServIds?.has(assignment.servId)) {
          completed++;
        }
      }
      const pct = assigned > 0 ? completed / assigned : 0;
      map.set(employeeId, { assigned, completed, pct });
    }

    return map;
  },
);

// ---------------------------------------------------------------------------
// Labor hours by employee (from timeCard state)
// ---------------------------------------------------------------------------

const selectLaborByEmployee = createSelector(
  [selectPunches],
  (punches): Map<string, { totalMinutes: number; regularMinutes: number; overtimeMinutes: number }> => {
    const map = new Map<string, { totalMinutes: number; regularMinutes: number; overtimeMinutes: number }>();
    if (punches.length === 0) return map;

    const timeCard = new TimeCard(punches);
    const byEmployee = timeCard.byEmployee;

    for (const [employeeId, employeePunches] of byEmployee) {
      const tc = new TimeCard(employeePunches);
      map.set(employeeId, {
        totalMinutes: tc.totalMinutes,
        regularMinutes: tc.regularMinutes,
        overtimeMinutes: tc.overtimeMinutes,
      });
    }

    return map;
  },
);

// ---------------------------------------------------------------------------
// Labor minutes by employee by date
// ---------------------------------------------------------------------------

const selectLaborByEmployeeByDate = createSelector(
  [selectPunches],
  (punches): Map<string, Map<string, number>> => {
    const map = new Map<string, Map<string, number>>();
    if (punches.length === 0) return map;

    const timeCard = new TimeCard(punches);
    for (const [employeeId, employeePunches] of timeCard.byEmployee) {
      const tc = new TimeCard(employeePunches);
      map.set(employeeId, tc.minutesByDate);
    }

    return map;
  },
);

// ---------------------------------------------------------------------------
// RouteGaps — travel/gap time metrics for route efficiency analysis.
// ---------------------------------------------------------------------------

export type RouteGaps = {
  /** Minutes from punch-in to first service start. null = no punch data. */
  beforeFirstStop: number | null;
  /** Total minutes between consecutive service end → next service start. null = no punch data. */
  betweenStops: number | null;
  /** Minutes from last service end to punch-out. null = no punch data. */
  afterLastStop: number | null;
  /** Sum of all three gap fields. null if any component is null. */
  totalGap: number | null;
  /** Total number of inter-stop gaps (stops - 1 per day) across all days. Used to compute avgBetween. */
  gapCount: number;
  /** Days in this aggregation that had punch data. */
  daysWithPunch: number;
  /** Total days in this aggregation. */
  daysTotal: number;
  /** Dates (yyyy-MM-dd) where punch data was absent. */
  missingPunchDates: string[];
};

const SENTINEL_TIME = "00:00:00";

function extractTime(isoOrTime: string): string {
  return isoOrTime.includes("T") ? isoOrTime.split("T")[1] ?? "" : isoOrTime;
}

function hasRealTime(isoOrTime: string): boolean {
  const t = extractTime(isoOrTime);
  return t !== "" && t !== SENTINEL_TIME;
}

function timeToMinutes(time: string): number {
  const parts = time.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  return h * 60 + m;
}

/**
 * Computes RouteGaps for a single employee on a single date.
 * Returns null fields when punch data is absent or no timed services exist.
 */
function computeDayRouteGaps(
  services: Service[],
  empId: string,
  punch: Punch | undefined,
  date: string,
): RouteGaps {
  const hasPunch = punch !== undefined;

  // Filter to services with real time data, sorted by start time
  const timed = services
    .filter((service) => {
      const startRaw = service.production?.timeRange.min ?? "";
      const endRaw = service.production?.timeRange.max ?? "";
      return hasRealTime(startRaw) && hasRealTime(endRaw);
    })
    .map((service) => ({
      startTime: extractTime(service.production!.timeRange.min),
      endTime: extractTime(service.production!.timeRange.max),
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (!hasPunch || timed.length === 0) {
    return {
      beforeFirstStop: null,
      betweenStops: null,
      afterLastStop: null,
      totalGap: null,
      gapCount: 0,
      daysWithPunch: hasPunch ? 1 : 0,
      daysTotal: 1,
      missingPunchDates: hasPunch ? [] : [date],
    };
  }

  const punchInTime = punch.segments[0]?.inTime ?? "";
  const punchOutTime = punch.segments[punch.segments.length - 1]?.outTime ?? "";

  const beforeFirstStop = hasRealTime(punchInTime)
    ? Math.max(0, timeToMinutes(timed[0]!.startTime) - timeToMinutes(punchInTime))
    : null;

  let betweenStops = 0;
  for (let i = 0; i < timed.length - 1; i++) {
    const gap = timeToMinutes(timed[i + 1]!.startTime) - timeToMinutes(timed[i]!.endTime);
    betweenStops += Math.max(0, gap);
  }

  const afterLastStop = hasRealTime(punchOutTime)
    ? Math.max(0, timeToMinutes(punchOutTime) - timeToMinutes(timed[timed.length - 1]!.endTime))
    : null;

  const totalGap =
    beforeFirstStop !== null && afterLastStop !== null
      ? beforeFirstStop + betweenStops + afterLastStop
      : null;

  return {
    beforeFirstStop,
    betweenStops,
    afterLastStop,
    totalGap,
    gapCount: Math.max(0, timed.length - 1),
    daysWithPunch: 1,
    daysTotal: 1,
    missingPunchDates: [],
  };
}

/**
 * Merges two RouteGaps by summing numeric fields and concatenating missing dates.
 * null fields accumulate as null only if both sides are null; otherwise the non-null value is used.
 */
function mergeRouteGaps(a: RouteGaps, b: RouteGaps): RouteGaps {
  const mergeField = (x: number | null, y: number | null): number | null => {
    if (x === null && y === null) return null;
    return (x ?? 0) + (y ?? 0);
  };

  const before = mergeField(a.beforeFirstStop, b.beforeFirstStop);
  const between = mergeField(a.betweenStops, b.betweenStops);
  const after = mergeField(a.afterLastStop, b.afterLastStop);

  return {
    beforeFirstStop: before,
    betweenStops: between,
    afterLastStop: after,
    totalGap: before !== null && after !== null ? (before + (between ?? 0) + after) : null,
    gapCount: a.gapCount + b.gapCount,
    daysWithPunch: a.daysWithPunch + b.daysWithPunch,
    daysTotal: a.daysTotal + b.daysTotal,
    missingPunchDates: [...a.missingPunchDates, ...b.missingPunchDates],
  };
}

// ---------------------------------------------------------------------------
// Completed services by employee by date (full Service objects for timeline)
// ---------------------------------------------------------------------------

const selectServicesByEmployeeByDate = createSelector(
  [selectCompletedServices],
  (services): Map<string, Map<string, Service[]>> => {
    const map = new Map<string, Map<string, Service[]>>();
    for (const service of services) {
      const doneDate = service.x.doneDate ?? "";
      const doneBys = service.production?.doneBys ?? [];
      for (const doneBy of doneBys) {
        let byDate = map.get(doneBy.employeeId);
        if (!byDate) {
          byDate = new Map<string, Service[]>();
          map.set(doneBy.employeeId, byDate);
        }
        const existing = byDate.get(doneDate) ?? [];
        existing.push(service);
        byDate.set(doneDate, existing);
      }
    }
    return map;
  },
);

// ---------------------------------------------------------------------------
// Route gaps by employee by date (atomic)
// ---------------------------------------------------------------------------

const selectRouteGapsByEmployeeByDate = createSelector(
  [selectServicesByEmployeeByDate, selectPunches],
  (servicesByEmployeeByDate, punches): Map<string, Map<string, RouteGaps>> => {
    // Build a punch lookup: "employeeId|date" → Punch
    const punchMap = new Map<string, Punch>();
    for (const punch of punches) {
      punchMap.set(`${punch.employeeId}|${punch.punchDate}`, punch);
    }

    const result = new Map<string, Map<string, RouteGaps>>();
    for (const [employeeId, byDate] of servicesByEmployeeByDate) {
      const byDateGaps = new Map<string, RouteGaps>();
      for (const [date, services] of byDate) {
        const punch = punchMap.get(`${employeeId}|${date}`);
        byDateGaps.set(date, computeDayRouteGaps(services, employeeId, punch, date));
      }
      result.set(employeeId, byDateGaps);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Route gaps by employee (aggregated across dates)
// ---------------------------------------------------------------------------

const selectRouteGapsByEmployee = createSelector(
  [selectRouteGapsByEmployeeByDate],
  (byEmployeeByDate): Map<string, RouteGaps> => {
    const result = new Map<string, RouteGaps>();
    for (const [employeeId, byDate] of byEmployeeByDate) {
      const gaps = Array.from(byDate.values());
      if (gaps.length === 0) continue;
      result.set(employeeId, gaps.reduce(mergeRouteGaps));
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Route gaps by date (aggregated across employees for that date)
// ---------------------------------------------------------------------------

const selectRouteGapsByDate = createSelector(
  [selectRouteGapsByEmployeeByDate],
  (byEmployeeByDate): Map<string, RouteGaps> => {
    const result = new Map<string, RouteGaps>();
    for (const [, byDate] of byEmployeeByDate) {
      for (const [date, gaps] of byDate) {
        const existing = result.get(date);
        result.set(date, existing ? mergeRouteGaps(existing, gaps) : { ...gaps });
      }
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const productivitySelect = {
  doneDateRange: selectDoneDateRange,
  completedServices: selectCompletedServices,
  totals: selectTotals,
  byEmployee: selectByEmployee,
  byEmployeeByDate: selectByEmployeeByDate,
  byDateByEmployee: selectByDateByEmployee,
  assignmentCompletionByEmployee: selectAssignmentCompletionByEmployee,
  laborByEmployee: selectLaborByEmployee,
  laborByEmployeeByDate: selectLaborByEmployeeByDate,
  servicesByEmployeeByDate: selectServicesByEmployeeByDate,
  routeGapsByEmployeeByDate: selectRouteGapsByEmployeeByDate,
  routeGapsByEmployee: selectRouteGapsByEmployee,
  routeGapsByDate: selectRouteGapsByDate,
};
