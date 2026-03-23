import { createSelector } from "@reduxjs/toolkit";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import { authSelect } from "@/app/auth/authSlice";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { AppState } from "@/store";

const selectAuthTech = createSelector([authSelect.user], (user) => user?.saId);
const selectTech = (state: AppState) => state.techRoute.tech;

const selectDefaultTech = createSelector(
  [selectAuthTech, selectTech],
  (authTech, tech) => (tech ? tech : authTech),
);

const selectRoutesByDate = createSelector(
  [coverSheetsSelect.servicesByDateAndEmployee, selectDefaultTech],
  (byDateAndEmployee, defaultTech) => {
    const result = new Map<string, Service[]>();

    byDateAndEmployee.forEach((employeeMap, date) => {
      const services = employeeMap.get(defaultTech ?? "");
      // const services = employeeMap.get("1BT");
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
    const services = routesByDate.get(routeDate) ?? [];
    return services;
  },
);

const selectAvailableTechs = createSelector(
  [coverSheetsSelect.servicesByDateAndEmployee],
  (byDateAndEmployee) => {
    const techIds = new Set<string>();
    byDateAndEmployee.forEach((employeeMap) => {
      employeeMap.forEach((_, employeeId) => {
        techIds.add(employeeId);
      });
    });
    return Array.from(techIds).sort();
  },
);

const selectLeftWith = (state: AppState) => state.techRoute.leftWith;

export const techRouteSelect = {
  routesByDate: selectRoutesByDate,
  routeDates: selectRouteDates,
  getRouteForDate: selectGetRouteForDate,
  routeDate: selectRouteDate,
  services: selectServices,
  availableTechs: selectAvailableTechs,
  tech: selectDefaultTech,
  leftWith: selectLeftWith,
};
