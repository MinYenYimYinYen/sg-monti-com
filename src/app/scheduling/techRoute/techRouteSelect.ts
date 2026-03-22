import { createSelector } from "@reduxjs/toolkit";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import { authSelect } from "@/app/auth/authSlice";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { AppState } from "@/store";

const selectRoutesByDate = createSelector(
  [coverSheetsSelect.servicesByDateAndEmployee, authSelect.user],
  (byDateAndEmployee, user) => {
    const result = new Map<string, Service[]>();

    byDateAndEmployee.forEach((employeeMap, date) => {
      if (!user) return null;

      // const services = employeeMap.get(user.saId);
      const services = employeeMap.get("1BT");
      if (services) {
        result.set(date, services);
      }
    });

    return result;
  },
);

const selectRouteDates = createSelector(
  [selectRoutesByDate],
  (routesByDate) => {
    return Array.from(routesByDate.keys());
  },
);

const selectGetRouteForDate = (date: string) =>
  createSelector([selectRoutesByDate], (routesByDate) => {
    return routesByDate.get(date) ?? [];
  });

const selectRouteDate = (state: AppState) => state.techRoute.routeDate;

const selectServices = createSelector(
  [selectRouteDate, selectRoutesByDate],
  (routeDate, routesByDate) => {
    if (!routeDate) return [];
    return routesByDate.get(routeDate) ?? [];
  },
);

export const techRouteSelect = {
  routesByDate: selectRoutesByDate,
  routeDates: selectRouteDates,
  getRouteForDate: selectGetRouteForDate,
  routeDate: selectRouteDate,
  services: selectServices,
};
