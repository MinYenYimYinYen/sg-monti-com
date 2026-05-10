import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { CountSizePriceOps } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import {
  RawProgCodePace,
  RawServCodePace,
  RawServCodePacePerDay,
  RawServCodePacePerDayPerEmployee,
} from "@/app/bizPlan/pace/RawPaceTypes";
import { PaceCategory } from "@/app/bizPlan/pace/PaceType";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

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

const selectRawServCodePaces = createSelector(
  [deepSelect.servCodes],
  (servCodes): RawServCodePace[] =>
    servCodes.map((servCode) => {
      // Finished: status === "S", program active
      const finishedServices = servCode.services.filter(
        (s) => s.status === "S" && s.program.status === "9",
      );
      const finishedCSP = CountSizePriceOps.sumAll(
        finishedServices.map((s) => CountSizePriceOps.fromService(s)),
      );
      const finishedRate = CountSizePriceOps.divideBy(
        finishedCSP,
        servCode.x.daysElapsed,
      );

      // Unfinished: printed + active + asap, program active
      const unfinishedServices = servCode.services.filter(
        (s) =>
          UNFINISHED_STATUSES.includes(s.status) && s.program.status === "9",
      );
      const unfinishedCSP = CountSizePriceOps.sumAll(
        unfinishedServices.map((s) => CountSizePriceOps.fromService(s)),
      );
      const unfinishedRate = CountSizePriceOps.divideBy(
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
          ? rawServCodePaces
              .map((p) => p.category)
              .reduce((best, c) => {
                const urgency: Record<PaceCategory, number> = {
                  asap: 0,
                  overdue: 1,
                  inProgress: 2,
                  notStarted: 3,
                  notSet: 4,
                };
                return urgency[c] < urgency[best] ? c : best;
              })
          : "notSet";

      const unfinishedCSP = CountSizePriceOps.sumAll(
        rawServCodePaces.map((p) => p.unfinishedCSP),
      );
      const finishedCSP = CountSizePriceOps.sumAll(
        rawServCodePaces.map((p) => p.finishedCSP),
      );

      return { progCode, rawServCodePaces, category, unfinishedCSP, finishedCSP };
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
      const { servCode, finishedCSP, unfinishedCSP } = raw;

      // Finished denominator: count of unique doneDates across all completed services
      const finishedDoneDates = new Set(
        servCode.services
          .filter((s) => s.status === "S" && s.x.doneDate != null)
          .map((s) => s.x.doneDate!),
      );
      const finishedDayCount = Math.max(finishedDoneDates.size, 1);
      const finishedPerDay = CountSizePriceOps.divideBy(
        finishedCSP,
        finishedDayCount,
      );

      // Unfinished numerator: active + asap only (no printed), program active
      const activeAsapCSP = CountSizePriceOps.sumAll(
        servCode.services
          .filter(
            (s) =>
              ACTIVE_ASAP_STATUSES.includes(s.status) &&
              s.program.status === "9",
          )
          .map((s) => CountSizePriceOps.fromService(s)),
      );

      // Unfinished denominator: weekdays from the day after the latest printed schedDate
      // through servCode.dateRange.max. Falls back to daysRemaining if no printed services.
      const printedSchedDates = servCode.services
        .filter(
          (s) => PRINTED_STATUSES.includes(s.status) && s.program.status === "9",
        )
        .map((s) => s.lastAssigned.schedDate)
        .filter(Boolean);

      let unfinishedDayCount: number;
      if (
        printedSchedDates.length > 0 &&
        dateRanges.isValidDateRange(servCode.dateRange)
      ) {
        const latestPrintedSchedDate = [...printedSchedDates].sort().at(-1)!;
        const startFrom = dateStrings.nextWeekdayAfter(latestPrintedSchedDate);
        // Only count days if startFrom is still within the dateRange
        if (startFrom <= servCode.dateRange.max) {
          const remainingRange = { min: startFrom, max: servCode.dateRange.max };
          unfinishedDayCount = Math.max(
            dateRanges.countWeekdays(remainingRange),
            1,
          );
        } else {
          unfinishedDayCount = 1;
        }
      } else {
        unfinishedDayCount = Math.max(servCode.x.daysRemaining, 1);
      }

      const unfinishedPerDay = CountSizePriceOps.divideBy(
        activeAsapCSP,
        unfinishedDayCount,
      );

      return { ...raw, finishedPerDay, unfinishedPerDay, unfinishedDayCount } satisfies RawServCodePacePerDay;
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
        finishedPerDayPerEmployee: CountSizePriceOps.divideBy(
          pace.finishedPerDay,
          employeeCount,
        ),
        unfinishedPerDayPerEmployee: CountSizePriceOps.divideBy(
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
  rawServCodePacesPerDayPerEmployeeMap: selectRawServCodePacesPerDayPerEmployeeMap,
};
