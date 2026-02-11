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

const selectCustomerContext = (state: AppState) =>
  state.customer.central.context;

const selectCustomerDocs = (state: AppState) =>
  state.customer.central.customerDocs;
const selectProgramDocs = (state: AppState) =>
  state.customer.central.programDocs;
const selectServiceDocs = (state: AppState) =>
  state.customer.central.serviceDocs;

const selectProgramDocMap = createSelector(
  [selectProgramDocs],
  (programDocs) => {
    // Deduplicate programs by progId to prevent hydration duplicates
    const uniqueProgramDocs = Array.from(
      new Map(programDocs.map((p) => [p.progId, p])).values(),
    );
    return new Grouper(uniqueProgramDocs)
      .groupBy((prog) => prog.custId)
      .toMap();
  },
);

const selectServiceDocMap = createSelector(
  [selectServiceDocs],
  (serviceDocs) => {
    // Deduplicate services by servId to prevent hydration duplicates
    const uniqueServiceDocs = Array.from(
      new Map(serviceDocs.map((s) => [s.servId, s])).values(),
    );
    return new Grouper(uniqueServiceDocs).groupBy((s) => s.progId).toMap();
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
  ],
  (
    customerDocs,
    programDocMap,
    serviceDocMap,
    progCodeMap,
    servCodeMap,
    basicTaxCodeMap,
  ) => {
    const customers: Customer[] = customerDocs.map((custDoc) => {
      const taxCodes = custDoc.taxIds
        .map((taxId) => basicTaxCodeMap.get(taxId) || baseTaxCode)
        .filter((tc) => tc.taxCodeId !== baseTaxCode.taxCodeId);
      const customer: Customer = {
        ...custDoc,
        programs: [],
        taxCodes,
      };

      const progDocs = programDocMap.get(custDoc.custId) || [];

      const programs = progDocs.map((progDoc) => {
        const progCode = progCodeMap.get(progDoc.progDefId) || baseProgCode;

        const program: Program = {
          ...progDoc,
          customer,
          services: [],
          progCode,
        };

        const serviceDocs = serviceDocMap.get(progDoc.progId) || [];

        const services = serviceDocs.map((servDoc) => {
          const servCode = servCodeMap.get(servDoc.servCodeId) || baseServCode;

          const service: Service = {
            ...servDoc,
            program,
            servCode,
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
  context: selectCustomerContext,
  customers: selectCustomers,
  programs: selectPrograms,
  services: selectServices,
  customerMap: customerMap,
};
