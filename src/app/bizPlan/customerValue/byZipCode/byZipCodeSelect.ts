import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { zipCodeSelect } from "@/app/realGreen/zipCode/zipCodeSelectors";
import { CustomerValueByZip } from "@/app/bizPlan/customerValue/customerValueTypes";
import { customerValueFilterSelect, ACTIVE_SERVICE_STATUSES } from "@/app/bizPlan/customerValue/customerValueFilterSelect";

/**
 * Computes CustomerValueByZip for every zip code in the filtered customer set.
 *
 * Active customer: status === "9" AND has at least one service with a qualifying status.
 * Qualifying service statuses: active (Y), asap (*), completed (S), printed ($).
 */
const selectCustomerValueByZip = createSelector(
  [customerValueFilterSelect.filteredCustomers, zipCodeSelect.zipCodeMap],
  (customers, zipCodeMap): CustomerValueByZip[] => {
    return new Grouper(customers)
      .groupBy((customer) => customer.address.zip ?? "")
      .summarize((zip, customersInZip): CustomerValueByZip => {
        const city = zipCodeMap.get(zip)?.city ?? "";

        let totalValue = 0;
        let totalSize = 0;
        let pestControlCount = 0;
        let mlcCount = 0;
        let extraServiceCount = 0;

        for (const customer of customersInZip) {
          totalSize += customer.size;

          const qualifyingServices = customer.x.services.filter(
            (service) =>
              ACTIVE_SERVICE_STATUSES.has(service.status) &&
              service.program.status === "9",
          );

          // Customer value: sum of getPriceAfterDiscounts across all qualifying services
          for (const service of qualifyingServices) {
            totalValue += service.x.getPriceAfterDiscounts("price");
          }

          // Pest control: at least one program with programType === "H"
          const hasPest = customer.programs.some(
            (program) => program.progCode.programType === "H",
          );
          if (hasPest) pestControlCount++;

          // MLC: at least one program with progCodeId === "MLC"
          const hasMlc = customer.programs.some(
            (program) => program.progCode.progCodeId === "MLC",
          );
          if (hasMlc) mlcCount++;

          // Extra services: qualifying services that are NOT pest and NOT MLC
          const extraServices = qualifyingServices.filter((service) => {
            const progCode = service.program.progCode;
            return progCode.programType !== "H" && progCode.progCodeId !== "MLC";
          });
          extraServiceCount += extraServices.length;
        }

        const activeCustomerCount = customersInZip.length;
        const avgCustomerValue =
          activeCustomerCount > 0 ? totalValue / activeCustomerCount : 0;
        const avgCustomerSize =
          activeCustomerCount > 0 ? totalSize / activeCustomerCount : 0;
        const avgExtraServicesPerCustomer =
          activeCustomerCount > 0 ? extraServiceCount / activeCustomerCount : 0;

        return {
          zip,
          city,
          activeCustomerCount,
          customerValue: totalValue,
          avgCustomerValue,
          avgCustomerSize,
          pestControlCustomerCount: pestControlCount,
          mlcCustomerCount: mlcCount,
          avgExtraServicesPerCustomer,
        };
      });
  },
);

/** Sorted list of all zip rows — used to populate the DataGrid. */
const selectAllZipRows = createSelector(
  [selectCustomerValueByZip],
  (rows): CustomerValueByZip[] =>
    [...rows].sort((a, b) => a.zip.localeCompare(b.zip)),
);

export type CustomerValueTotals = {
  activeCustomerCount: number;
  customerValue: number;
  avgCustomerValue: number;
  avgCustomerSize: number;
  pestControlCustomerCount: number;
  mlcCustomerCount: number;
  avgExtraServicesPerCustomer: number;
};

/** Weighted totals across all zip rows (already filtered by the shared filter). */
const selectTotals = createSelector(
  [selectAllZipRows],
  (rows): CustomerValueTotals => {
    const totalCustomers = rows.reduce((sum, r) => sum + r.activeCustomerCount, 0);
    const totalValue = rows.reduce((sum, r) => sum + r.customerValue, 0);
    const totalPest = rows.reduce((sum, r) => sum + r.pestControlCustomerCount, 0);
    const totalMlc = rows.reduce((sum, r) => sum + r.mlcCustomerCount, 0);
    // Weighted averages
    const weightedExtraSum = rows.reduce(
      (sum, r) => sum + r.avgExtraServicesPerCustomer * r.activeCustomerCount,
      0,
    );
    const weightedSizeSum = rows.reduce(
      (sum, r) => sum + r.avgCustomerSize * r.activeCustomerCount,
      0,
    );

    return {
      activeCustomerCount: totalCustomers,
      customerValue: totalValue,
      avgCustomerValue: totalCustomers > 0 ? totalValue / totalCustomers : 0,
      avgCustomerSize: totalCustomers > 0 ? weightedSizeSum / totalCustomers : 0,
      pestControlCustomerCount: totalPest,
      mlcCustomerCount: totalMlc,
      avgExtraServicesPerCustomer:
        totalCustomers > 0 ? weightedExtraSum / totalCustomers : 0,
    };
  },
);

export const byZipCodeSelect = {
  allZipRows: selectAllZipRows,
  totals: selectTotals,
};
