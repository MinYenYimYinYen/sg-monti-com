import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { AppError } from "@/lib/errors/AppError";

const validateProgramNextDateMatches = (service: Service) => {
  return (
    service.lastAssigned.schedDate.split("T")[0] ===
    service.program.nextDate.split("T")[0]
  );
};

// Base selector: fully expanded data structure
export const selectServicesByDateAndEmployee = createSelector(
  [centralSelect.services],
  (services): Map<string, Map<string, Service[]>> => {
    const printed = services.filter((service) => service.status === "$");
    const tempResult = new Map<string, Map<string, Service[]>>();

    printed.forEach((service) => {
      const date = service.program.nextDate;
      const employeeId = service.lastAssigned.employeeId;

      // if (!validateProgramNextDateMatches(service)) {
      //   throw new AppError({
      //     message:
      //       "Unexpected: Assignment schedDate does not match program nextDate." +
      //       "Report this up the chain of command.",
      //     type: "VALIDATION_ERROR",
      //     data: service,
      //   });
      // }

      if (!date || !employeeId) return;

      if (!tempResult.has(date)) {
        tempResult.set(date, new Map<string, Service[]>());
      }

      const dateMap = tempResult.get(date)!;

      if (!dateMap.has(employeeId)) {
        dateMap.set(employeeId, []);
      }

      dateMap.get(employeeId)!.push(service);
    });

    // Sort dates and create new Map with sorted order
    const sortedDates = Array.from(tempResult.keys()).sort();
    const result = new Map<string, Map<string, Service[]>>();
    sortedDates.forEach((date) => {
      const employeeMap = tempResult.get(date)!;
      const sortedEmployeeIds = Array.from(employeeMap.keys()).sort();
      const sortedEmployeeMap = new Map<string, Service[]>();
      sortedEmployeeIds.forEach((employeeId) => {
        const services = employeeMap.get(employeeId)!;
        // Sort services by program.tempSeq in ascending order
        const sortedServices = services.sort((a, b) =>
          (a.program.tempSeq ?? 0) - (b.program.tempSeq ?? 0)
        );
        sortedEmployeeMap.set(employeeId, sortedServices);
      });
      result.set(date, sortedEmployeeMap);
    });

    return result;
  },
);

// Derived selector: flatten to services by date (for card headers)
export const selectServicesByDate = createSelector(
  [selectServicesByDateAndEmployee],
  (byDateAndEmployee): Map<string, Service[]> => {
    const result = new Map<string, Service[]>();

    byDateAndEmployee.forEach((employeeMap, date) => {
      const allServicesForDate: Service[] = [];
      employeeMap.forEach((services) => {
        allServicesForDate.push(...services);
      });
      result.set(date, allServicesForDate);
    });

    return result;
  },
);

export const coverSheetsSelect = {
  servicesByDateAndEmployee: selectServicesByDateAndEmployee,
  servicesByDate: selectServicesByDate,
};
