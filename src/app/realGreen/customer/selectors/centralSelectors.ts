import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/Grouper";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

const selectCustomerContext = (state: AppState) =>
  state.customer.central.context;

const selectCustomerDocs = (state: AppState) =>
  state.customer.central.customerDocs;
const selectProgramDocs = (state: AppState) =>
  state.customer.central.programDocs;
const selectServiceDocs = (state: AppState) =>
  state.customer.central.serviceDocs;

const selectCustomerDocMap = createSelector(
  [selectCustomerDocs],
  (customerDocs) => {
    return new Grouper(customerDocs).toUniqueMap((e) => e.custId);
  },
);

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

export const selectCustomers = createSelector(
  [selectCustomerDocs, selectProgramDocMap, selectServiceDocMap],
  (customerDocs, programDocMap, serviceDocMap) => {
    const customers: Customer[] = customerDocs.map((custDoc) => {
      const customer = {
        ...custDoc,
        // TODO: RESOLVE TYPESCRIPT ERRORS HERE BY HYDRATING CUSTOMER OBJECTS (TAX, DISCOUNT, ETC)
      } as Customer;

      const progDocs = programDocMap.get(custDoc.custId) || [];

      const programs = progDocs.map((progDoc) => {
        const program = {
          ...progDoc,
          // TODO: RESOLVE TYPESCRIPT ERRORS HERE BY HYDRATING PROGRAM OBJECTS
        } as Program;

        program.customer = customer;

        const serviceDocs = serviceDocMap.get(progDoc.progId) || [];

        const services = serviceDocs.map((servDoc) => {
          const service = {
            ...servDoc,
            // TODO: RESOLVE TYPESCRIPT ERRORS HERE BY HYDRATING SERVICE OBJECTS
          } as Service;

          service.program = program;

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

export const customerSelect = {
  context: selectCustomerContext,
  customers: selectCustomers,
  programs: selectPrograms,
  services: selectServices,
};
