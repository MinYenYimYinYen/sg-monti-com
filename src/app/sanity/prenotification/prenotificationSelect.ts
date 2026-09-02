import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { sanitySelect } from "@/app/sanity/sanitySelect";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// Each tab groups entities by the callAhead.description set directly on that entity.
// customer.callAhead, program.callAhead, and service.callAhead are independent —
// no inheritance or fallback across levels.

export type PrenotificationCustomerGroup = {
  description: string;
  customers: Customer[];
  count: number;
};

export type PrenotificationProgramGroup = {
  description: string;
  programs: Program[];
  count: number;
};

export type PrenotificationServiceGroup = {
  description: string;
  services: Service[];
  count: number;
};

/** Customers that have a callAhead set directly on them, grouped by callAhead.description. */
const selectCustomerGroups = createSelector(
  [sanitySelect.customers],
  (customers): PrenotificationCustomerGroup[] => {
    const withCallAhead = customers.filter((c) => c.callAhead !== null);
    const map = new Grouper(withCallAhead)
      .groupBy((c) => c.callAhead!.description)
      .toMap();
    return [...map.entries()]
      .map(([description, custs]) => ({
        description,
        customers: custs,
        count: custs.length,
      }))
      .sort((a, b) => b.count - a.count || a.description.localeCompare(b.description));
  },
);

/** Programs that have a callAhead set directly on them, grouped by callAhead.description. */
const selectProgramGroups = createSelector(
  [sanitySelect.programs],
  (programs): PrenotificationProgramGroup[] => {
    const withCallAhead = programs.filter((p) => p.callAhead !== null);
    const map = new Grouper(withCallAhead)
      .groupBy((p) => p.callAhead!.description)
      .toMap();
    return [...map.entries()]
      .map(([description, progs]) => ({
        description,
        programs: progs,
        count: progs.length,
      }))
      .sort((a, b) => b.count - a.count || a.description.localeCompare(b.description));
  },
);

/** Services that have a callAhead set directly on them, grouped by callAhead.description. */
const selectServiceGroups = createSelector(
  [sanitySelect.services],
  (services): PrenotificationServiceGroup[] => {
    const withCallAhead = services.filter((s) => s.callAhead !== null);
    const map = new Grouper(withCallAhead)
      .groupBy((s) => s.callAhead!.description)
      .toMap();
    return [...map.entries()]
      .map(([description, servs]) => ({
        description,
        services: servs,
        count: servs.length,
      }))
      .sort((a, b) => b.count - a.count || a.description.localeCompare(b.description));
  },
);

const selectCustomerCount = createSelector(
  [selectCustomerGroups],
  (groups) => groups.reduce((sum, g) => sum + g.count, 0),
);

const selectProgramCount = createSelector(
  [selectProgramGroups],
  (groups) => groups.reduce((sum, g) => sum + g.count, 0),
);

const selectServiceCount = createSelector(
  [selectServiceGroups],
  (groups) => groups.reduce((sum, g) => sum + g.count, 0),
);

export const prenotificationSelect = {
  customerGroups: selectCustomerGroups,
  programGroups: selectProgramGroups,
  serviceGroups: selectServiceGroups,
  customerCount: selectCustomerCount,
  programCount: selectProgramCount,
  serviceCount: selectServiceCount,
};
