import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { CSPOps } from "@/app/realGreen/customer/_lib/entities/types/CSPTypesAndClass";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import {
  RawProgCodePace,
  RawServCodePace,
  RawServCodePacePerDay,
  RawServCodePacePerDayPerEmployee,
} from "@/app/bizPlan/pace/RawPaceTypes";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { mostUrgentCategory } from "@/app/bizPlan/pace/_lib/paceUtils";
import { PaceCategory } from "../PaceTypes";

function getCategory(servCode: ServCodeDeep): PaceCategory {
  if (servCode.alwaysAsap) return "asap";
  if (!dateRanges.isValidDateRange(servCode.dateRange)) return "notSet";
  const today = dateStrings.today();
  if (today < servCode.dateRange.min) return "notStarted";
  if (today > servCode.dateRange.max) return "overdue";
  return "inProgress";
}

const PRINTED_STATUSES = getServiceStatuses(["printed"]);
const ACTIVE_ASAP_STATUSES = getServiceStatuses(["active", "asap"]);
const UNFINISHED_STATUSES = getServiceStatuses(["printed", "active", "asap"]);

// ---------------------------------------------------------------------------
// Projection window helpers
// ---------------------------------------------------------------------------

type ProjectionWindow = {
  projectionStartDate: string | null;
  unfinishedDayCount: number;
};

// Returns the projection window start date and the number of weekdays in that window.
// When printed services exist, the window starts the day after the latest printed schedDate.
// Falls back to daysRemaining when no printed services exist.
function computeProjectionWindow(
  servCode: ServCodeDeep,
  printedSchedDates: string[],
): ProjectionWindow {
  const today = dateStrings.today();

  if (printedSchedDates.length > 0 && dateRanges.isValidDateRange(servCode.dateRange)) {
    const latestPrintedSchedDate = [...printedSchedDates].sort().at(-1)!;
    const startFrom = dateStrings.nextWeekdayAfter(latestPrintedSchedDate);
    const projectionStartDate = startFrom;

    // Only count days if startFrom is still within the dateRange
    if (startFrom <= servCode.dateRange.max) {
      const remainingRange = { min: startFrom, max: servCode.dateRange.max };
      const unfinishedDayCount = Math.max(dateRanges.countWeekdays(remainingRange), 1);
      return { projectionStartDate, unfinishedDayCount };
    } else {
      return { projectionStartDate, unfinishedDayCount: 1 };
    }
  }

  // No printed services: projection starts from max(today, dateRange.min)
  const projectionStartDate = dateRanges.isValidDateRange(servCode.dateRange)
    ? (today > servCode.dateRange.min ? today : servCode.dateRange.min)
    : null;

  return {
    projectionStartDate,
    unfinishedDayCount: Math.max(servCode.x.daysRemaining, 1),
  };
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const selectRawServCodePaces = createSelector(
  [deepSelect.servCodes],
  (servCodes): RawServCodePace[] =>
    servCodes.map((servCode) => {
      // Finished: status === "S", program active
      const finishedServices = servCode.services.filter(
        (s) => s.status === "S" && s.program.status === "9",
      );
      const finishedCSP = CSPOps.sumAll(
        finishedServices.map((s) => CSPOps.fromService(s)),
      );
      const finishedRate = CSPOps.divideBy(
        finishedCSP,
        servCode.x.daysElapsed,
      );

      // Unfinished: printed + active + asap, program active
      const unfinishedServices = servCode.services.filter(
        (s) =>
          UNFINISHED_STATUSES.includes(s.status) && s.program.status === "9",
      );
      const unfinishedCSP = CSPOps.sumAll(
        unfinishedServices.map((s) => CSPOps.fromService(s)),
      );
      const unfinishedRate = CSPOps.divideBy(
        unfinishedCSP,
        servCode.x.daysRemaining,
      );

      return {
        servCode,
        daysRemaining: servCode.x.daysRemaining,
        category: getCategory(servCode),
        unfinishedCSP,
        unfinishedRate,
        finishedCSP,
        finishedRate,
      };
    }),
);

const selectRawServCodePaceMap = createSelector(
  [selectRawServCodePaces],
  (paces) => new Grouper(paces).toUniqueMap((p) => p.servCode.servCodeId),
);

const selectRawProgCodePaces = createSelector(
  [progServSelect.progCodes, selectRawServCodePaceMap],
  (progCodes, paceMap): RawProgCodePace[] =>
    progCodes.map((progCode) => {
      const rawServCodePacesMaybe = progCode.servCodes.map((sc) =>
        paceMap.get(sc.servCodeId),
      );
      const rawServCodePaces = typeGuard.definedArray(rawServCodePacesMaybe);

      const category: PaceCategory =
        rawServCodePaces.length > 0
          ? mostUrgentCategory(rawServCodePaces.map((p) => p.category))
          : "notSet";

      const unfinishedCSP = CSPOps.sumAll(
        rawServCodePaces.map((p) => p.unfinishedCSP),
      );
      const finishedCSP = CSPOps.sumAll(
        rawServCodePaces.map((p) => p.finishedCSP),
      );

      return {
        progCode,
        rawServCodePaces,
        category,
        unfinishedCSP,
        finishedCSP,
      };
    }),
);

const selectRawProgCodePaceMap = createSelector(
  [selectRawProgCodePaces],
  (paces) => new Grouper(paces).toUniqueMap((p) => p.progCode.progCodeId),
);

const selectRawServCodePacesPerDay = createSelector(
  [selectRawServCodePaces],
  (rawPaces): RawServCodePacePerDay[] =>
    rawPaces.map((raw) => {
      const { servCode, finishedCSP } = raw;

      // Finished denominator: count of unique doneDates across all completed services
      const finishedDoneDates = new Set(
        servCode.services
          .filter((s) => s.status === "S" && s.x.doneDate != null)
          .map((s) => s.x.doneDate!),
      );
      const finishedDayCount = Math.max(finishedDoneDates.size, 1);
      const finishedPerDay = CSPOps.divideBy(finishedCSP, finishedDayCount);

      // Unfinished numerator: active + asap only (no printed), program active
      const activeAsapCSP = CSPOps.sumAll(
        servCode.services
          .filter(
            (s) =>
              ACTIVE_ASAP_STATUSES.includes(s.status) &&
              s.program.status === "9",
          )
          .map((s) => CSPOps.fromService(s)),
      );

      // Unfinished denominator: weekdays from the day after the latest printed schedDate
      // through servCode.dateRange.max. Falls back to daysRemaining if no printed services.
      const printedSchedDates = servCode.services
        .filter((s) => PRINTED_STATUSES.includes(s.status) && s.program.status === "9")
        .map((s) => s.lastAssigned.schedDate)
        .filter(Boolean);

      const { projectionStartDate, unfinishedDayCount } = computeProjectionWindow(
        servCode,
        printedSchedDates,
      );

      const unfinishedPerDay = CSPOps.divideBy(activeAsapCSP, unfinishedDayCount);

      return {
        ...raw,
        finishedPerDay,
        unfinishedPerDay,
        unfinishedDayCount,
        activeAsapCSP,
        projectionStartDate,
      } satisfies RawServCodePacePerDay;
    }),
);

const selectRawServCodePacesPerDayMap = createSelector(
  [selectRawServCodePacesPerDay],
  (paces) => new Grouper(paces).toUniqueMap((p) => p.servCode.servCodeId),
);

const selectRawServCodePacesPerDayPerEmployee = createSelector(
  [selectRawServCodePacesPerDay],
  (perDayPaces): RawServCodePacePerDayPerEmployee[] =>
    perDayPaces.map((pace) => {
      const employeeCount = Math.max(pace.servCode.assignedTo.length, 1);
      return {
        ...pace,
        finishedPerDayPerEmployee: CSPOps.divideBy(
          pace.finishedPerDay,
          employeeCount,
        ),
        unfinishedPerDayPerEmployee: CSPOps.divideBy(
          pace.unfinishedPerDay,
          employeeCount,
        ),
      };
    }),
);

const selectRawServCodePacesPerDayPerEmployeeMap = createSelector(
  [selectRawServCodePacesPerDayPerEmployee],
  (paces) => new Grouper(paces).toUniqueMap((p) => p.servCode.servCodeId),
);

// Expose the shared UNFINISHED_STATUSES set so paceSelect can reuse it
export { UNFINISHED_STATUSES };

export const rawPaceSelect = {
  rawServCodePaces: selectRawServCodePaces,
  rawServCodePaceMap: selectRawServCodePaceMap,
  rawProgCodePaces: selectRawProgCodePaces,
  rawProgCodePaceMap: selectRawProgCodePaceMap,
  rawServCodePacesPerDay: selectRawServCodePacesPerDay,
  rawServCodePacesPerDayMap: selectRawServCodePacesPerDayMap,
  rawServCodePacesPerDayPerEmployee: selectRawServCodePacesPerDayPerEmployee,
  rawServCodePacesPerDayPerEmployeeMap:
    selectRawServCodePacesPerDayPerEmployeeMap,
};
