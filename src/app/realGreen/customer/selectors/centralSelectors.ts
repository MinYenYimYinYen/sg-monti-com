import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/Grouper";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { progServBaseSelect } from "@/app/realGreen/progServ/_lib/selectors/progServBaseSelectors";
import { baseProgCode } from "@/app/realGreen/progServ/_lib/baseProgCode";
import { baseServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { basicTaxCodeSelect } from "@/app/realGreen/taxCode/taxCodeBaseSelectors";
import { baseTaxCode } from "@/app/realGreen/taxCode/_lib/baseTaxCode";
import { callAheadSelect } from "../../callAhead/selectors/callAheadSelect";
import { discountSelect } from "../../discount/selectors/discountSelect";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import hydrateProduction from "@/app/realGreen/customer/selectors/hydrateProduction";
import { hydrateProductsPlanned } from "@/app/realGreen/customer/selectors/hydrateProductsPlanned";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { custFlagSelect } from "@/app/realGreen/custFlag/_lib/custFlagSelect";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { hydrateFlags } from "@/app/realGreen/customer/selectors/hydrateFlags";

const selectActiveContexts = (state: AppState) =>
  state.customer.central.activeContexts;

// Base selectors read Maps from state
const selectCustDocMap = (state: AppState) => state.customer.central.CustDocMap;
const selectProgDocMap = (state: AppState) => state.customer.central.ProgDocMap;
const selectServDocMap = (state: AppState) => state.customer.central.ServDocMap;

// Convert Maps to arrays for hydration logic
const selectCustomerDocs = createSelector([selectCustDocMap], (map) =>
  Array.from(map.values()),
);

const selectProgramDocs = createSelector([selectProgDocMap], (map) =>
  Array.from(map.values()),
);

const selectServiceDocs = createSelector([selectServDocMap], (map) =>
  Array.from(map.values()),
);

// Build relationship maps from arrays (deduplication already handled in slice)
const selectProgramDocMap = createSelector(
  [selectProgramDocs],
  (programDocs) => {
    return new Grouper(programDocs).groupBy((prog) => prog.custId).toMap();
  },
);

const selectServiceDocMap = createSelector(
  [selectServiceDocs],
  (serviceDocs) => {
    return new Grouper(serviceDocs).groupBy((s) => s.progId).toMap();
  },
);

// Use BASE selectors to avoid circular dependency
const selectProgCodeMapByDefId = createSelector(
  [progServBaseSelect.basicProgCodes],
  (progCodes) => new Grouper(progCodes).toUniqueMap((p) => p.progDefId),
);

const selectServCodeMap = createSelector(
  [progServBaseSelect.basicServCodes],
  (servCodes) => new Grouper(servCodes).toUniqueMap((s) => s.servCodeId),
);

export const selectCustomers = createSelector(
  [
    selectCustomerDocs,
    selectProgramDocMap,
    selectServiceDocMap,
    selectProgCodeMapByDefId,
    selectServCodeMap,
    basicTaxCodeSelect.basicTaxCodeMap,
    callAheadSelect.callAheadDocMap,
    discountSelect.discountDocMap,
    productSelect.productCommonDocMap,
    employeeSelect.employeeMap,
    flagSelect.flagDocMap,
    custFlagSelect.custIdFlagIds,
  ],
  (
    customerDocs,
    programDocMap,
    serviceDocMap,
    progCodeMap,
    servCodeMap,
    basicTaxCodeMap,
    callAheadDocMap,
    discountDocMap,
    productCommonDocMap,
    employeeMap,
    flagDocMap,
    custIdFlagIds,
  ) => {
    const customers: Customer[] = customerDocs.map((custDoc) => {
      const taxCodes = custDoc.taxIds
        .map((taxId) => basicTaxCodeMap.get(taxId) || baseTaxCode)
        .filter((tc) => tc.taxCodeId !== baseTaxCode.taxCodeId);
      const customer: Customer = {
        ...custDoc,
        programs: [],
        taxCodes,
        callAhead: callAheadDocMap.get(custDoc.callAheadId) || null,
        discount: discountDocMap.get(custDoc.discountId) || null,
        flags: hydrateFlags(custDoc.custId, custIdFlagIds, flagDocMap),
      };

      const progDocs = programDocMap.get(custDoc.custId) || [];

      const programs = progDocs.map((progDoc) => {
        const progCode = progCodeMap.get(progDoc.progDefId) || baseProgCode;

        const program: Program = {
          ...progDoc,
          customer,
          services: [],
          progCode,
          callAhead: callAheadDocMap.get(progDoc.callAheadId) || null,
          discount: discountDocMap.get(progDoc.discountId) || null,
        };

        const serviceDocs = serviceDocMap.get(progDoc.progId) || [];

        const services = serviceDocs.map((servDoc) => {
          const servCode = servCodeMap.get(servDoc.servCodeId) || baseServCode;

          const service: Service = {
            ...servDoc,
            program,
            servCode,
            callAhead: callAheadDocMap.get(servDoc.callAheadId) || null,
            discount: discountDocMap.get(servDoc.discountId) || null,
            production: hydrateProduction(
              servDoc.productionCore,
              productCommonDocMap,
              employeeMap,
              servDoc,
            ),
            productsPlanned: hydrateProductsPlanned(
              servDoc,
              servCodeMap,
              productCommonDocMap,
            ),
          };

          return service;
        });

        program.services = services;

        return program;
      });

      customer.programs = programs;

      return customer;
    });

    return customers;
  },
);

const selectPrograms = createSelector([selectCustomers], (customers) => {
  return customers.flatMap((c) => c.programs);
});

const selectServices = createSelector([selectPrograms], (programs) => {
  return programs.flatMap((p) => p.services);
});

const customerMap = createSelector([selectCustomers], (customers) => {
  return new Grouper(customers).toUniqueMap((c) => c.custId);
});

export const centralSelect = {
  context: selectActiveContexts,
  customers: selectCustomers,
  programs: selectPrograms,
  services: selectServices,
  customerMap: customerMap,
};
