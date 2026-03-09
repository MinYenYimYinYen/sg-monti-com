import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
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
import { hydrateLastAssigned } from "@/app/realGreen/customer/selectors/hydrateLastAssigned";
import { csvSelect } from "@/app/csv/_lib/csvSelect";
import { ServiceUtils } from "@/app/realGreen/customer/_lib/classes/ServiceUtils";
import { ProgramUtils } from "@/app/realGreen/customer/_lib/classes/ProgramUtils";
import { CustomerUtils } from "@/app/realGreen/customer/_lib/classes/CustomerUtils";
import { serviceConditionSelect } from "@/app/realGreen/serviceCondition/_lib/selectors/serviceConditionSelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";

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
    callAheadSelect.callAheadMap,
    discountSelect.discountDocMap,
    productSelect.productCommonMap,
    productSelect.allProductsMap,
    employeeSelect.employeeMap,
    flagSelect.flagDocMap,
    custFlagSelect.custIdFlagIds,
    csvSelect.assignments,
    serviceConditionSelect.serviceConditionsByServId,
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
    productCommonMap,
    allProductsMap,
    employeeMap,
    flagDocMap,
    custIdFlagIds,
    newAssignments,
    serviceConditionsByServId,
  ) => {
    // Builder types for type-safe construction without 'x'
    type CustomerBuilder = Omit<Customer, "x">;
    type ProgramBuilder = Omit<Program, "x">;
    type ServiceBuilder = Omit<Service, "x">;

    const customers: Customer[] = customerDocs.map((custDoc) => {
      const taxCodes = custDoc.taxIds
        .map((taxId) => basicTaxCodeMap.get(taxId) || baseTaxCode)
        .filter((tc) => tc.taxCodeId !== baseTaxCode.taxCodeId);

      // Phase 1: Build customer without x, empty programs array
      const customerBuilder: CustomerBuilder = {
        ...custDoc,
        programs: [],
        taxCodes,
        callAhead: callAheadDocMap.get(custDoc.callAheadId) || null,
        discount: discountDocMap.get(custDoc.discountId) || null,
        flags: hydrateFlags(custDoc.custId, custIdFlagIds, flagDocMap),
      };

      const progDocs = programDocMap.get(custDoc.custId) || [];

      // Phase 2: Build programs referencing the customer builder
      const programs = progDocs.map((progDoc) => {
        const progCode = progCodeMap.get(progDoc.progDefId) || baseProgCode;

        const programBuilder: ProgramBuilder = {
          ...progDoc,
          customer: customerBuilder as Customer,
          services: [],
          progCode,
          callAhead: callAheadDocMap.get(progDoc.callAheadId) || null,
          discount: discountDocMap.get(progDoc.discountId) || null,
        };

        const serviceDocs = serviceDocMap.get(progDoc.progId) || [];

        // Phase 3: Build services referencing the program builder
        const services = serviceDocs.map((servDoc) => {
          const servCode = servCodeMap.get(servDoc.servCodeId) || baseServCode;

          const lastAssigned = hydrateLastAssigned(
            servDoc,
            newAssignments,
            progDoc,
            employeeMap,
          );

          const serviceBuilder: ServiceBuilder = {
            ...servDoc,
            program: programBuilder as Program,
            servCode,
            callAhead: callAheadDocMap.get(servDoc.callAheadId) || null,
            discount: discountDocMap.get(servDoc.discountId) || null,
            production: hydrateProduction({
              productionCore: servDoc.productionCore,
              allProductsMap,
              employeeMap,
              serviceDoc: servDoc,
              serviceConditions: serviceConditionsByServId.get(servDoc.servId) || [],
              }
            ),
            productsPlanned: hydrateProductsPlanned(
              servDoc,
              servCodeMap,
              productCommonMap,
            ),
            lastAssigned,
          };

          // Add x after all other properties are set - mutate in place to preserve references
          (serviceBuilder as Service).x = new ServiceUtils(serviceBuilder);

          return serviceBuilder as Service;
        });

        // Populate services array before adding x
        programBuilder.services = services;

        // Add x after services are populated - mutate in place to preserve references
        (programBuilder as Program).x = new ProgramUtils(programBuilder);

        return programBuilder as Program;
      });

      // Populate programs array before adding x
      customerBuilder.programs = programs;

      // Add x after programs are populated - mutate in place to preserve references
      (customerBuilder as Customer).x = new CustomerUtils(customerBuilder);

      return customerBuilder as Customer;
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

const selectCustomerMap = createSelector([selectCustomers], (customers) => {
  return new Grouper(customers).toUniqueMap((c) => c.custId);
});



export const centralSelect = {
  context: selectActiveContexts,
  serviceDocs: selectServiceDocs,
  customers: selectCustomers,
  programs: selectPrograms,
  services: selectServices,
  customerMap: selectCustomerMap,
  // custIds: selectCustIds,
};
