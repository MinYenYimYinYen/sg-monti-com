import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { loadoutSelect } from "@/app/loadout/loadoutSelect";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { buildLoadoutActuals } from "@/app/scheduling/dailyInventory/loadoutFeedback/helpers/buildLoadoutActuals";
import { LoadoutFeedback } from "@/app/scheduling/dailyInventory/loadoutFeedback/LoadoutFeedback";
import { LoadoutReportEntry } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/LoadoutReportTypes";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectDateRange = (state: AppState) => state.loadoutReport.dateRange;

/**
 * Builds one LoadoutReportEntry per finished loadout in the store.
 * Completed services are matched by employeeId (via production.doneBys) and doneDate.
 * Scheduled services are not tracked in this report — LoadoutFeedback receives an empty array.
 */
const selectLoadoutReportEntries = createSelector(
  [
    loadoutSelect.finishedLoadoutMap,
    centralSelect.services,
  ],
  (finishedLoadoutMap, services): LoadoutReportEntry[] => {
    const entries: LoadoutReportEntry[] = [];

    finishedLoadoutMap.forEach((loadout) => {
      const { employeeId, routeDate } = loadout;

      const completedServices = services.filter((service) => {
        if (service.status !== "S") return false;
        if (!service.production) return false;
        if (service.production.doneDate !== routeDate) return false;
        return service.production.doneBys.some((db) => db.employeeId === employeeId);
      });

      const actuals = buildLoadoutActuals(completedServices, loadout);
      const feedback = new LoadoutFeedback(actuals, completedServices, []);

      entries.push({ employeeId, routeDate, loadout, completedServices, actuals, feedback });
    });

    // Sort by routeDate descending, then employeeId ascending
    entries.sort((a, b) => {
      const dateCmp = b.routeDate.localeCompare(a.routeDate);
      return dateCmp !== 0 ? dateCmp : a.employeeId.localeCompare(b.employeeId);
    });

    return entries;
  },
);

/** Groups report entries by employeeId, each group sorted by routeDate descending. */
const selectReportEntriesByEmployee = createSelector(
  [selectLoadoutReportEntries],
  (entries) => new Grouper(entries).groupBy((e) => e.employeeId).toMap(),
);

/** Groups report entries by routeDate, each group sorted by employeeId ascending. */
const selectReportEntriesByDate = createSelector(
  [selectLoadoutReportEntries],
  (entries) => new Grouper(entries).groupBy((e) => e.routeDate).toMap(),
);

/**
 * Sorted list of employeeIds that appear in the report entries,
 * ordered by employee name for display.
 */
const selectReportEmployeeIds = createSelector(
  [selectReportEntriesByEmployee, employeeSelect.employeeMap],
  (byEmployee, employeeMap) =>
    Array.from(byEmployee.keys()).sort((a, b) => {
      const nameA = employeeMap.get(a)?.name ?? a;
      const nameB = employeeMap.get(b)?.name ?? b;
      return nameA.localeCompare(nameB);
    }),
);

export const loadoutReportSelect = {
  dateRange: selectDateRange,
  entries: selectLoadoutReportEntries,
  entriesByEmployee: selectReportEntriesByEmployee,
  entriesByDate: selectReportEntriesByDate,
  employeeIds: selectReportEmployeeIds,
};
