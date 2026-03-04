import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// const validateProgramNextDateMatches = (service: Service) => {
//   return (
//     service.lastAssigned.schedDate.split("T")[0] ===
//     service.program.nextDate.split("T")[0]
//   );
// };

export const selectServicesByDateAndEmployee = createSelector(
  [centralSelect.services],
  (services): Map<string, Map<string, Service[]>> => {
    const printed = services.filter((service) => service.status === "$");

    console.log(
      "printed",
      printed
        .filter((p) => p.lastAssigned.employeeId === "1AL")
        .map((p) => p.x.customer.displayName),
    );

    const tempResult = new Map<string, Map<string, Service[]>>();

    printed.forEach((service) => {
      const date = service.lastAssigned.schedDate;

      if(!date) {
        console.log("lastAssigned", service.lastAssigned);
      }


      const employeeId = service.lastAssigned.employeeId;

      // SO YOU KNOW ***
      // program.nextDate is not reliable.  If later services have a schedule date, it will
      // use the schedule date for the next service instead.  So, the source of the
      // schedule date has to be from the unserviced report CSV.
      // if (!validateProgramNextDateMatches(service)) {
      //   console.log(service.x.customer.displayName, service.program.nextDate, service.lastAssigned.schedDate, service.servId);
      //
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
        const sortedServices = services.sort(
          (a, b) => (a.program.tempSeq ?? 0) - (b.program.tempSeq ?? 0),
        );
        sortedEmployeeMap.set(employeeId, sortedServices);
      });
      result.set(date, sortedEmployeeMap);
    });

    console.log("result", result);

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
