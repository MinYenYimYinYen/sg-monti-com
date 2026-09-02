import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { sanitySelect } from "@/app/sanity/sanitySelect";
import { CustomerQuery } from "@/app/realGreen/customer/_lib/classes/CustomerQuery";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// Programs are already filtered by excludedProgCodeIds in sanitySelect.

// Customers tab: customers where ALL programs are zero-revenue (total revenue = 0)
const selectZeroRevenueCustomers = createSelector(
  [sanitySelect.customers],
  (customers): Customer[] =>
    new CustomerQuery(customers).isZeroRevenue("renewal").results,
);

// Programs tab: programs where ALL renewal-eligible services are zero-revenue
// (sanitySelect.programs is already filtered to active status and excluded prog codes)
// Includes programs from non-zero-revenue customers (waterfall: fix customers first)
const selectZeroRevenuePrograms = createSelector(
  [sanitySelect.programs],
  (programs): Program[] =>
    programs.filter((p) => p.x.isZeroRevenue("renewal")),
);

// Services tab: all individual zero-revenue renewal-eligible services
// (sanitySelect.services derives from active programs only)
// Includes services from non-zero-revenue programs (waterfall: fix programs next)
const selectZeroRevenueServices = createSelector(
  [sanitySelect.services],
  (services): Service[] =>
    services.filter((s) => s.x.isZeroRevenue("renewal")),
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
