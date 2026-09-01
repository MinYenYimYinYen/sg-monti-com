import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { CustomerQuery } from "@/app/realGreen/customer/_lib/classes/CustomerQuery";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// Customers tab: customers where ALL programs are zero-revenue (total revenue = 0)
const selectZeroRevenueCustomers = createSelector(
  [centralSelect.customers],
  (customers): Customer[] =>
    new CustomerQuery(customers).isZeroRevenue("renewal").results,
);

// Programs tab: active programs where ALL renewal-eligible services are zero-revenue
// Includes programs from non-zero-revenue customers (waterfall: fix customers first)
const selectZeroRevenuePrograms = createSelector(
  [centralSelect.customers],
  (customers): Program[] =>
    customers
      .flatMap((c) => c.programs)
      .filter((p) => p.status === "9")
      .filter((p) => p.x.isZeroRevenue("renewal")),
);

// Services tab: all individual zero-revenue renewal-eligible services from active programs
// Includes services from non-zero-revenue programs (waterfall: fix programs next)
const selectZeroRevenueServices = createSelector(
  [centralSelect.customers],
  (customers): Service[] =>
    customers
      .flatMap((c) => c.programs)
      .filter((p) => p.status === "9")
      .flatMap((p) => p.services)
      .filter((s) => s.x.isZeroRevenue("renewal")),
);

export type ZeroProgCodeGroup = {
  progCodeId: string;
  programs: Program[];
  count: number;
};

const selectZeroProgramsByProgCode = createSelector(
  [selectZeroRevenuePrograms],
  (programs): ZeroProgCodeGroup[] => {
    const map = new Grouper(programs).groupBy((p) => p.progCode.progCodeId).toMap();
    return [...map.entries()]
      .map(([progCodeId, progs]) => ({
        progCodeId,
        programs: progs,
        count: progs.length,
      }))
      .sort((a, b) => b.count - a.count || a.progCodeId.localeCompare(b.progCodeId));
  },
);

export type ZeroServCodeGroup = {
  servCodeId: string;
  services: Service[];
  count: number;
};

const selectZeroServicesByServCode = createSelector(
  [selectZeroRevenueServices],
  (services): ZeroServCodeGroup[] => {
    const map = new Grouper(services).groupBy((s) => s.servCodeId).toMap();
    return [...map.entries()]
      .map(([servCodeId, servs]) => ({
        servCodeId,
        services: servs,
        count: servs.length,
      }))
      .sort((a, b) => b.count - a.count || a.servCodeId.localeCompare(b.servCodeId));
  },
);

export const zeroRevenueSelect = {
  customers: selectZeroRevenueCustomers,
  programs: selectZeroRevenuePrograms,
  services: selectZeroRevenueServices,
  programsByProgCode: selectZeroProgramsByProgCode,
  servicesByServCode: selectZeroServicesByServCode,
};
