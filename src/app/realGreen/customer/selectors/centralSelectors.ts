import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { PriorityServiceDoc } from "@/app/priorityService/PriorityServiceTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { CustomerDoc } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { ProgramDoc } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { baseProgCode } from "@/app/realGreen/progServ/_lib/baseProgCode";
import { callAheadSelect } from "../../callAhead/selectors/callAheadSelect";
import { discountSelect } from "../../discount/selectors/discountSelect";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import hydrateProduction from "@/app/realGreen/customer/selectors/hydrateProduction";
import { getProductionOrFallback } from "@/app/productivity/completedServiceProductionFallback";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { custFlagSelect } from "@/app/realGreen/custFlag/_lib/custFlagSelect";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { hydrateFlags } from "@/app/realGreen/customer/selectors/hydrateFlags";
import { hydrateLastAssigned } from "@/app/realGreen/customer/selectors/hydrateLastAssigned";
import { centralDocPropsSelect } from "@/app/csv/_lib/centralDocPropsSelect";
import { ServiceUtils } from "@/app/realGreen/customer/_lib/classes/ServiceUtils";
import { ProgramUtils } from "@/app/realGreen/customer/_lib/classes/ProgramUtils";
import { CustomerUtils } from "@/app/realGreen/customer/_lib/classes/CustomerUtils";
import { serviceConditionSelect } from "@/app/realGreen/serviceCondition/_lib/selectors/serviceConditionSelect";
import { parsePromiseString } from "@/app/schedPromise/parsePromise";
import { hydratePlannedLoadout } from "@/app/realGreen/customer/selectors/hydratePlannedLoadout";
import { baseServCode } from "../../progServ/_lib/baseServCode";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import { taxCodeSelect } from "../../taxCode/taxCodeSelectors";
import { serviceEtaSelect } from "@/app/scheduling/eta/serviceEtaSelect";
import { hydrateEta } from "@/app/realGreen/customer/selectors/hydrateEta";
import { Aging } from "@/app/realGreen/customer/_lib/classes/Aging";

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

const selectProgCodeMapByDefId = createSelector(
  [progServSelect.progCodes],
  (progCodes) => new Grouper(progCodes).toUniqueMap((p) => p.progDefId),
);

const selectServCodeMap = createSelector(
  [progServSelect.servCodes],
  (servCodes) => new Grouper(servCodes).toUniqueMap((s) => s.servCodeId),
);

const selectPriorityServiceDocs = (state: AppState): PriorityServiceDoc[] =>
  state.priorityService.docs;

const selectPriorityServiceDocMap = createSelector(
  [selectPriorityServiceDocs],
  (docs) => new Grouper(docs).toUniqueMap((d) => d.servId),
);

// ---------------------------------------------------------------------------
// makeCustomersSelector — reusable hydration factory
//
// Accepts selectors for customer/program/service docs from any source slice
// (central Map, single slice, etc.) and returns a fully hydrated Customer[].
// Create instances at module level to preserve memoization.
// ---------------------------------------------------------------------------

type DocArraySelector<T> = (state: AppState) => T[];

export function makeCustomersSelector(
  custDocsSelector: DocArraySelector<CustomerDoc>,
  progDocsSelector: DocArraySelector<ProgramDoc>,
  servDocsSelector: DocArraySelector<ServiceDoc>,
) {
  const selectProgDocMapLocal = createSelector(
    [progDocsSelector],
    (programDocs) => new Grouper(programDocs).groupBy((prog) => prog.custId).toMap(),
  );

  const selectServiceDocMapLocal = createSelector(
    [servDocsSelector],
    (serviceDocs) => new Grouper(serviceDocs).groupBy((s) => s.progId).toMap(),
  );

  return createSelector(
    [
      custDocsSelector,
      selectProgDocMapLocal,
      selectServiceDocMapLocal,
      selectProgCodeMapByDefId,
      selectServCodeMap,
      taxCodeSelect.taxCodeMap,
      callAheadSelect.callAheadMap,
      discountSelect.discountDocMap,
      productSelect.allProductsMap,
      employeeSelect.employeeMap,
      flagSelect.flagDocMap,
      custFlagSelect.custIdFlagIds,
      centralDocPropsSelect.assignments,
      serviceConditionSelect.serviceConditionsByServId,
      serviceEtaSelect.serviceEtaMap,
      selectPriorityServiceDocMap,
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
      allProductsMap,
      employeeMap,
      flagDocMap,
      custIdFlagIds,
      newAssignments,
      serviceConditionsByServId,
      serviceEtaMap,
      priorityServiceDocMap,
    ) => {
      // Builder types for type-safe construction without 'x'
      type CustomerBuilder = Omit<Customer, "x">;
      type ProgramBuilder = Omit<Program, "x">;
      type ServiceBuilder = Omit<Service, "x">;

      const customers: Customer[] = customerDocs.map((custDoc) => {
        const taxCodesMaybe = custDoc.taxIds.map((taxId) =>
          basicTaxCodeMap.get(taxId),
        );

        const taxCodes = typeGuard.definedArray(taxCodesMaybe);
        const taxRate = taxCodes.reduce(
          (acc, taxCode) => acc + taxCode.taxRate,
          0,
        );
        // Parse customer promise inline
        const custPromiseResult = parsePromiseString({
          techNote: custDoc.techNote,
          entityType: "customer",
          entityId: custDoc.custId,
        });

        // Phase 1: Build customer without x, empty programs array
        const customerBuilder: CustomerBuilder = {
          ...custDoc,
          programs: [],
          taxCodes,
          taxRate,
          callAhead: callAheadDocMap.get(custDoc.callAheadId) ?? null,
          discount: discountDocMap.get(custDoc.discountId) ?? null,
          aging: new Aging(custDoc.agingParams),
          flags: hydrateFlags(custDoc.custId, custIdFlagIds, flagDocMap),
          promise: custPromiseResult.promise,
          promiseIssues: custPromiseResult.issues,
        };

        const progDocs = programDocMap.get(custDoc.custId) || [];

        // Phase 2: Build programs referencing the customer builder
        const programs = progDocs.map((progDoc) => {
          const progCode = progCodeMap.get(progDoc.progDefId) || baseProgCode;

          // Parse program promise inline
          const progPromiseResult = parsePromiseString({
            techNote: progDoc.techNote,
            entityType: "program",
            entityId: progDoc.progId,
          });

          const programBuilder: ProgramBuilder = {
            ...progDoc,
            customer: customerBuilder as Customer,
            services: [],
            progCode,
            callAhead: callAheadDocMap.get(progDoc.callAheadId) ?? null,
            discount: discountDocMap.get(progDoc.discountId) ?? null,
            promise: progPromiseResult.promise,
            promiseIssues: progPromiseResult.issues,
          };

          const serviceDocs = serviceDocMap.get(progDoc.progId) ?? [];

          // Phase 3: Build services referencing the program builder
          const services = serviceDocs.map((servDoc) => {
            const servCode = servCodeMap.get(servDoc.servCodeId) ?? baseServCode;

            const lastAssigned = hydrateLastAssigned(
              servDoc,
              newAssignments,
              progDoc,
              employeeMap,
            );

            // Parse service promise inline
            const servPromiseResult = parsePromiseString({
              techNote: servDoc.techNote,
              entityType: "service",
              entityId: servDoc.servId,
            });

            const serviceBuilder: ServiceBuilder = {
              ...servDoc,
              // Merge optimistic ETA override from centralDocProps state
              eta: hydrateEta({
                servId: servDoc.servId,
                invoice: servDoc.invoice,
                serviceEtaMap,
              }),
              program: programBuilder as Program,
              servCode,
              callAhead: callAheadDocMap.get(servDoc.callAheadId) ?? null,
              discount: discountDocMap.get(servDoc.discountId) ?? null,
              production: getProductionOrFallback({
                ...servDoc,
                production: hydrateProduction({
                  productionCore: servDoc.productionCore,
                  allProductsMap,
                  employeeMap,
                  serviceDoc: servDoc,
                  serviceConditions:
                    serviceConditionsByServId.get(servDoc.servId) ?? [],
                }),
                // Provide required ServiceProps fields so the shape satisfies
                // Omit<Service, "x"> for the fallback check. These are
                // overwritten by the serviceBuilder spread below.
                program: programBuilder as Program,
                servCode,
                callAhead: callAheadDocMap.get(servDoc.callAheadId) ?? null,
                discount: discountDocMap.get(servDoc.discountId) ?? null,
                lastAssigned,
                promise: null,
                promiseIssues: [],
                loadoutInventory: { masters: [], singles: [], subProducts: [] },
                eta: null,
                priorityService: null,
              }),
              lastAssigned,
              promise: servPromiseResult.promise,
              promiseIssues: servPromiseResult.issues,
              loadoutInventory: hydratePlannedLoadout({ servDoc, servCodeMap }),
              priorityService: priorityServiceDocMap.get(servDoc.servId) ?? null,
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
}

// ---------------------------------------------------------------------------
// Central selector instances — use the central Map as the source
// ---------------------------------------------------------------------------

export const selectCustomers = makeCustomersSelector(
  selectCustomerDocs,
  selectProgramDocs,
  selectServiceDocs,
);

const selectCustomerMap = createSelector([selectCustomers], (customers) => {
  return new Grouper(customers).toUniqueMap((c) => c.custId);
});

// Global flag filter — applies selectedFlagIds from custFlagSlice to centralSelect.customers.
// For a per-feature independent filter (e.g., two flag-filtered views on screen simultaneously),
// use makeCustFlagFilterSelectors() from custFlagFilterSelect.ts.
// See src/app/realGreen/custFlag/docs/custFlagFilterPlan.md for architecture notes.
const selectFilteredCustomers = createSelector(
  [selectCustomers, custFlagSelect.selectedFlagIds],
  (customers, flagIds) => {
    if (flagIds.length === 0) return customers;
    return customers.filter((customer) => {
      //If cust has any of the flagIds, TRUE
      return customer.flags.some((flag) => flagIds.includes(flag.flagId));
    });
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

export const centralSelect = {
  context: selectActiveContexts,
  customerDocs: selectCustomerDocs,
  programDocs: selectProgramDocs,
  serviceDocs: selectServiceDocs,
  customers: selectFilteredCustomers,
  programs: selectFilteredPrograms,
  services: selectFilteredServices,
  customerMap: selectCustomerMap,
};
