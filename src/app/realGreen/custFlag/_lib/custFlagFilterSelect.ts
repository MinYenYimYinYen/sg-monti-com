import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";

/**
 * Factory that creates a memoized { customers, programs, services } selector set
 * filtered by the provided flagIds selector. Each call produces an independent
 * memoized instance — call at module level, never inside a component or render function.
 *
 * Use this when a feature needs its own flag filter independent of the global
 * custFlagSlice.selectedFlagIds. The global filter (via centralSelect) is the default
 * path; this factory is the escape hatch for independent per-feature filters.
 *
 * @see src/app/realGreen/custFlag/docs/custFlagFilterPlan.md — architecture and design decisions
 */
export function makeCustFlagFilterSelectors(
  selectFlagIds: (state: AppState) => number[],
) {
  const selectFilteredCustomers = createSelector(
    [centralSelect.customers, selectFlagIds],
    (customers, flagIds) => {
      if (flagIds.length === 0) return customers;
      return customers.filter((customer) =>
        customer.flags.some((f) => flagIds.includes(f.flagId)),
      );
    },
  );

  const selectFilteredPrograms = createSelector(
    [selectFilteredCustomers],
    (customers) => customers.flatMap((c) => c.programs),
  );

  const selectFilteredServices = createSelector(
    [selectFilteredPrograms],
    (programs) => programs.flatMap((p) => p.services),
  );

  return {
    customers: selectFilteredCustomers,
    programs: selectFilteredPrograms,
    services: selectFilteredServices,
  };
}

/** Pure utilities — operate on a single Customer, no memoization concerns.
 *  Use inside selector filter callbacks. */
export const custFlagFilter = {
  hasAnyFlagIds: (customer: Customer, flagIds: number[]) =>
    customer.flags.some((f) => flagIds.includes(f.flagId)),

  hasAllFlagIds: (customer: Customer, flagIds: number[]) =>
    flagIds.every((id) => customer.flags.some((f) => f.flagId === id)),

  hasNoFlagIds: (customer: Customer, flagIds: number[]) =>
    !customer.flags.some((f) => flagIds.includes(f.flagId)),
};
