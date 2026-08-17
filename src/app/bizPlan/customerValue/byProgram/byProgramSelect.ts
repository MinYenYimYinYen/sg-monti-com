import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { customerValueFilterSelect, ACTIVE_SERVICE_STATUSES } from "@/app/bizPlan/customerValue/customerValueFilterSelect";

export type CustomerValueByProgram = {
  progCodeId: string;
  description: string;
  serviceCount: number;
  programCount: number;
  customerCount: number;
  avgServsPerProgram: number;
  totalSize: number;
  avgSize: number;
  totalRev: number;
  avgServiceRev: number;
};

/**
 * Computes CustomerValueByProgram by flattening all qualifying services across
 * filtered customers and grouping by service.program.progCode.progCodeId.
 *
 * Only includes services from active programs (program.status === "9").
 * Qualifying service statuses: active (Y), asap (*), completed (S), printed ($).
 *
 * Metrics per progCodeId:
 * - serviceCount: total qualifying services with this progCodeId
 * - programCount: distinct programs (by progId) containing those services
 * - customerCount: distinct customers who have those services
 * - totalSize: sum of service.size across all qualifying services
 * - avgSize: totalSize / serviceCount
 * - totalRev: sum of getPriceAfterDiscounts("price") across all qualifying services
 * - avgServiceRev: totalRev / serviceCount
 */
const selectCustomerValueByProgram = createSelector(
  [customerValueFilterSelect.filteredCustomers],
  (customers): CustomerValueByProgram[] => {
    // Flatten all qualifying services from active programs across all filtered customers
    const allQualifyingServices = customers.flatMap((customer) =>
      customer.x.services.filter(
        (service) =>
          ACTIVE_SERVICE_STATUSES.has(service.status) &&
          service.program.status === "9",
      ),
    );

    return new Grouper(allQualifyingServices)
      .groupBy((service) => service.program.progCode.progCodeId)
      .summarize((progCodeId, services): CustomerValueByProgram => {
        const firstService = services[0];
        const serviceCount = services.length;
        const programCount = new Set(services.map((s) => s.program.progId)).size;
        const customerCount = new Set(
          services.map((s) => s.program.customer.custId),
        ).size;
        const totalSize = services.reduce((sum, s) => sum + s.size, 0);
        const totalRev = services.reduce(
          (sum, s) => sum + s.x.getPriceAfterDiscounts("price"),
          0,
        );

        return {
          progCodeId,
          description: firstService.program.progCode.description,
          serviceCount,
          programCount,
          customerCount,
          avgServsPerProgram: programCount > 0 ? serviceCount / programCount : 0,
          totalSize,
          avgSize: serviceCount > 0 ? totalSize / serviceCount : 0,
          totalRev,
          avgServiceRev: serviceCount > 0 ? totalRev / serviceCount : 0,
        };
      });
  },
);

/** Sorted by totalRev descending. */
const selectAllProgramRows = createSelector(
  [selectCustomerValueByProgram],
  (rows): CustomerValueByProgram[] =>
    [...rows].sort((a, b) => b.totalRev - a.totalRev),
);

export type ProgramTotals = {
  serviceCount: number;
  programCount: number;
  customerCount: number;
  avgServsPerProgram: number;
  totalSize: number;
  avgSize: number;
  totalRev: number;
  avgServiceRev: number;
};

const selectProgramTotals = createSelector(
  [selectAllProgramRows],
  (rows): ProgramTotals => {
    const serviceCount = rows.reduce((sum, r) => sum + r.serviceCount, 0);
    const programCount = rows.reduce((sum, r) => sum + r.programCount, 0);
    const customerCount = rows.reduce((sum, r) => sum + r.customerCount, 0);
    const totalSize = rows.reduce((sum, r) => sum + r.totalSize, 0);
    const totalRev = rows.reduce((sum, r) => sum + r.totalRev, 0);

    return {
      serviceCount,
      programCount,
      customerCount,
      avgServsPerProgram: programCount > 0 ? serviceCount / programCount : 0,
      totalSize,
      avgSize: serviceCount > 0 ? totalSize / serviceCount : 0,
      totalRev,
      avgServiceRev: serviceCount > 0 ? totalRev / serviceCount : 0,
    };
  },
);

export const byProgramSelect = {
  allProgramRows: selectAllProgramRows,
  totals: selectProgramTotals,
};
