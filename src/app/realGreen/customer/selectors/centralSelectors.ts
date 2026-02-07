import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/Grouper";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { baseProgCode } from "@/app/realGreen/progServ/_lib/baseProgCode";
import { baseServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

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

export const selectCustomers = createSelector(
  [
    selectCustomerDocs,
    selectProgramDocMap,
    selectServiceDocMap,
    selectProgCodeMapByDefId,
    selectServCodeMap,
  ],
  (customerDocs, programDocMap, serviceDocMap, progCodeMap, servCodeMap) => {
    const customers: Customer[] = customerDocs.map((custDoc) => {
      const customer: Customer = {
        ...custDoc,
        programs: [],
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

export const centralSelect = {
  context: selectCustomerContext,
  customers: selectCustomers,
  programs: selectPrograms,
  services: selectServices,
};
