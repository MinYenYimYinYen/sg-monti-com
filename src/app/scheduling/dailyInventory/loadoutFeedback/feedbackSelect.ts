import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { assignmentSelect } from "@/app/assignment/assignmentSelect";

// ServIds for the current employee+date — used by the hook to trigger customer data fetch
const selectAssignedServIds = (employeeId: string, schedDate: string) =>
  assignmentSelect.servIdsByEmployeeAndSchedDate(employeeId, schedDate);

/**
 * Returns all completed services (status "S") where the given employee appears
 * in production.doneBys and the service was scheduled on the given routeDate.
 *
 * Uses the fully hydrated Production type — doneBys[].employee is available.
 */
const selectCompletedServicesForTech = (
  employeeId: string,
  routeDate: string,
) =>
  createSelector([centralSelect.services], (services) => {
    const completedServices = services.filter((service) => {
      if (!(service.status === "S")) return false;
      if (service.production === null) return false;
      if (
        !service.production.doneBys.some(
          (doneBy) => doneBy.employeeId === employeeId,
        )
      )
        return false;
      if (routeDate === service.production.doneDate) return true;
    });
    return completedServices;
  });

const selectScheduledServicesForTech = (
  employeeId: string,
  routeDate: string,
) =>
  createSelector([centralSelect.services], (services) => {
    return services.filter((service) => {
      const canonical = service.assignments.canonicalForDate(routeDate);
      return canonical?.employeeId === employeeId;
    });
  });

export const feedbackSelect = {
  assignedServIds: selectAssignedServIds,
  completedServicesForTech: selectCompletedServicesForTech,
  scheduledServicesForTech: selectScheduledServicesForTech,
};
