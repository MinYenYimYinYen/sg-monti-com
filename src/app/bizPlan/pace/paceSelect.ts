import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import {
  CountSizePrice,
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";

const selectSelectedDateRange = (state: AppState) =>
  state.pace.selectedDateRange;
const selectMinProductiveServices = (state: AppState) =>
  state.pace.minProductiveServices;

const selectServCodesFinished = createSelector(
  [deepSelect.servCodes],
  (servCodes) => {
    return servCodes.map((servCode) => {
      const finishedServices = servCode.services.filter(
        (s) => s.status === "S",
      );
      return {
        ...servCode,
        services: finishedServices,
      };
    });
  },
);

const selectServCodeUnfinished = createSelector(
  [deepSelect.servCodes],
  (servCodes) => {
    return servCodes.map((servCode) => {
      const unfinishedServices = servCode.services.filter((s) =>
        getServiceStatuses(["printed", "active", "asap"]).includes(s.status),
      );
      return {
        ...servCode,
        services: unfinishedServices,
      };
    });
  },
);

export type EmployeePace = {
  employee: Employee;
  finishedCSP: CountSizePrice;
  capacityRate: CountSizePrice;
  requiredRate: CountSizePrice;
  delta: CountSizePrice;
};

export type ServCodePace = {
  servCode: ServCodeDeep;
  daysRemaining: number;

  unfinishedCSP: CountSizePrice;
  unfinishedRate: CountSizePrice;

  finishedCSP: CountSizePrice;
  finishedRate: CountSizePrice;

  employeePaces: EmployeePace[];
};

/**
 * Builds a per-employee capacity rate map from all finished services within
 * the lookback window. Only days where the employee completed at least
 * minProductiveServices are counted — this filters out rain days, sick days,
 * and partial days that would skew the average down.
 */
const selectEmployeeCapacityMap = createSelector(
  [centralSelect.services, selectSelectedDateRange, selectMinProductiveServices],
  (allServices, dateRange, minProductiveServices): Map<string, CountSizePrice> => {
    const finishedInWindow = allServices.filter(
      (s) =>
        s.status === "S" &&
        s.x.doneDate !== null &&
        s.x.doneDate >= dateRange.min &&
        s.x.doneDate <= dateRange.max,
    );

    // Group by employeeId → doneDate → services
    // Structure: Map<employeeId, Map<doneDate, CountSizePrice>>
    const employeeDayMap = new Map<string, Map<string, CountSizePrice>>();

    for (const service of finishedInWindow) {
      const doneDate = service.x.doneDate!;
      const doneBys = service.x.doneBys;

      if (doneBys === null) {
        console.warn(
          `[paceSelect] Completed service ${service.servId} has null doneBys — skipping for capacity calculation.`,
        );
        continue;
      }

      const csp = CountSizePriceOps.fromService(service);

      for (const doneBy of doneBys) {
        const { employeeId } = doneBy;
        if (!employeeDayMap.has(employeeId)) {
          employeeDayMap.set(employeeId, new Map());
        }
        const dayMap = employeeDayMap.get(employeeId)!;
        const existing = dayMap.get(doneDate) ?? { ...baseCountSizePrice };
        dayMap.set(doneDate, CountSizePriceOps.sum(existing, csp));
      }
    }

    // For each employee, filter qualifying days and average them
    const capacityMap = new Map<string, CountSizePrice>();

    for (const [employeeId, dayMap] of employeeDayMap) {
      const qualifyingDays = Array.from(dayMap.values()).filter(
        (dayCsp) => dayCsp.count >= minProductiveServices,
      );

      if (qualifyingDays.length === 0) continue;

      const total = CountSizePriceOps.sumAll(qualifyingDays);
      const avg = CountSizePriceOps.divideBy(total, qualifyingDays.length);
      capacityMap.set(employeeId, avg);
    }

    return capacityMap;
  },
);

const selectServCodePaceMap = createSelector(
  [
    selectServCodeUnfinished,
    selectServCodesFinished,
    selectEmployeeCapacityMap,
  ],
  (
    unfinishedServCodes,
    finishedServCodes,
    employeeCapacityMap,
  ): Map<string, ServCodePace> => {
    // Pre-index finished serv codes by servCodeId for O(1) lookup
    const finishedByServCodeId = new Grouper(finishedServCodes).toUniqueMap(
      (s) => s.servCodeId,
    );

    const servCodePaceMap = new Map<string, ServCodePace>();

    for (const servCode of unfinishedServCodes) {
      const daysRemaining = servCode.x.daysRemaining;

      const unfinishedCSP =
        servCode.services.length > 0
          ? CountSizePriceOps.sumAll(
              servCode.services.map((s) => CountSizePriceOps.fromService(s)),
            )
          : { ...baseCountSizePrice };

      const unfinishedRate = CountSizePriceOps.divideBy(
        unfinishedCSP,
        daysRemaining,
      );

      const finishedServCode = finishedByServCodeId.get(servCode.servCodeId);
      const finishedServices = finishedServCode?.services ?? [];
      const totalWeekdays = servCode.x.weekDays.length;

      const finishedCSP =
        finishedServices.length > 0
          ? CountSizePriceOps.sumAll(
              finishedServices.map((s) => CountSizePriceOps.fromService(s)),
            )
          : { ...baseCountSizePrice };

      // Rate of completion relative to total season weekdays
      const finishedRate = CountSizePriceOps.divideBy(
        finishedCSP,
        totalWeekdays,
      );

      // Build per-employee paces for assigned employees
      const assignedEmployees = servCode.assignedTo;

      // Compute per-employee finished CSP on this specific servCode
      const employeeFinishedCSPMap = new Map<string, CountSizePrice>();
      for (const service of finishedServices) {
        const doneBys = service.x.doneBys;
        if (doneBys === null) continue;
        const csp = CountSizePriceOps.fromService(service);
        for (const doneBy of doneBys) {
          const existing =
            employeeFinishedCSPMap.get(doneBy.employeeId) ?? {
              ...baseCountSizePrice,
            };
          employeeFinishedCSPMap.set(
            doneBy.employeeId,
            CountSizePriceOps.sum(existing, csp),
          );
        }
      }

      // Determine fallback capacity rate: average of employees who have data
      const employeesWithCapacity = assignedEmployees.filter((e) =>
        employeeCapacityMap.has(e.employeeId),
      );
      const fallbackCapacityRate: CountSizePrice =
        employeesWithCapacity.length > 0
          ? CountSizePriceOps.divideBy(
              CountSizePriceOps.sumAll(
                employeesWithCapacity.map(
                  (e) => employeeCapacityMap.get(e.employeeId)!,
                ),
              ),
              employeesWithCapacity.length,
            )
          : assignedEmployees.length > 0
            ? CountSizePriceOps.divideBy(unfinishedCSP, assignedEmployees.length)
            : { ...baseCountSizePrice };

      const employeePaces: EmployeePace[] = assignedEmployees.map(
        (employee) => {
          const empFinishedCSP =
            employeeFinishedCSPMap.get(employee.employeeId) ?? {
              ...baseCountSizePrice,
            };

          const capacityRate =
            employeeCapacityMap.get(employee.employeeId) ?? fallbackCapacityRate;

          // Each employee's required rate = their share of remaining work / daysRemaining
          // Share is proportional to capacity; if no capacity data, split evenly
          const totalCapacity =
            assignedEmployees.length > 0
              ? CountSizePriceOps.sumAll(
                  assignedEmployees.map(
                    (e) =>
                      employeeCapacityMap.get(e.employeeId) ??
                      fallbackCapacityRate,
                  ),
                )
              : { ...baseCountSizePrice };

          const share =
            totalCapacity.count > 0
              ? capacityRate.count / totalCapacity.count
              : assignedEmployees.length > 0
                ? 1 / assignedEmployees.length
                : 0;

          const requiredRate = CountSizePriceOps.divideBy(
            {
              count: unfinishedCSP.count * share,
              size: unfinishedCSP.size * share,
              price: unfinishedCSP.price * share,
              rev: unfinishedCSP.rev * share,
            },
            daysRemaining,
          );

          const delta: CountSizePrice = {
            count: capacityRate.count - requiredRate.count,
            size: capacityRate.size - requiredRate.size,
            price: capacityRate.price - requiredRate.price,
            rev: capacityRate.rev - requiredRate.rev,
          };

          return {
            employee,
            finishedCSP: empFinishedCSP,
            capacityRate,
            requiredRate,
            delta,
          };
        },
      );

      servCodePaceMap.set(servCode.servCodeId, {
        servCode,
        daysRemaining,
        unfinishedCSP,
        unfinishedRate,
        finishedCSP,
        finishedRate,
        employeePaces,
      });
    }

    return servCodePaceMap;
  },
);

const selectServCodePaceRows = createSelector(
  [selectServCodePaceMap],
  (paceMap): ServCodePace[] =>
    Array.from(paceMap.values()).sort((a, b) =>
      a.servCode.servCodeId.localeCompare(b.servCode.servCodeId),
    ),
);

export const paceSelect = {
  servCodePaceMap: selectServCodePaceMap,
  servCodePaceRows: selectServCodePaceRows,
};
