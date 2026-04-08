import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";

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
      console.log("doneDate", service.production.doneDate, routeDate);
      if (routeDate === service.production.doneDate) return true;
    });
    console.log("services", services);
    console.log("completedServices", completedServices);
    return completedServices;
  });

const selectScheduledServicesForTech = (
  employeeId: string,
  routeDate: string,
) =>
  createSelector([centralSelect.services], (services) => {
    const scheduledServices = services.filter((service) => {
      const matchingAssignment = service.assignments.find(
        (assignment) =>
          assignment.employeeId === employeeId &&
          assignment.schedDate === routeDate,
      );
      return matchingAssignment !== undefined;
    });
    return scheduledServices;
  });

export const feedbackSelect = {
  completedServicesForTech: selectCompletedServicesForTech,
  scheduledServicesForTech: selectScheduledServicesForTech,
};
