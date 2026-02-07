import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/Grouper";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

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

export const selectTerminatingCustomers = createSelector(
  [selectCustomerDocs, selectProgramDocMap, selectServiceDocMap],
  (customerDocs, programDocMap, serviceDocMap) => {
    // Helper to create a "Base" object (terminator)
    // These objects satisfy the type but have no navigation properties or empty ones
    const createBaseCustomer = (doc: any): Customer =>
      ({ ...doc, programs: [] }) as Customer; //todo: these should be replaced with baseEntities defined in _lib
    const createBaseProgram = (doc: any): Program =>
      ({ ...doc, services: [], customer: {} as Customer }) as Program;
    const createBaseService = (doc: any): Service =>
      ({ ...doc, program: {} as Program }) as Service;

    const customers: Customer[] = customerDocs.map((custDoc) => {
      // 1. Main Customer Node
      const customer = {
        ...custDoc,
        // TODO: RESOLVE TYPESCRIPT ERRORS HERE BY HYDRATING CUSTOMER OBJECTS
      } as Customer;

      const progDocs = programDocMap.get(custDoc.custId) || [];

      const programs = progDocs.map((progDoc) => {
        // 2. Main Program Node
        const program = {
          ...progDoc,
          // TODO: RESOLVE TYPESCRIPT ERRORS HERE BY HYDRATING PROGRAM OBJECTS
        } as Program;

        // 2a. Program -> Customer Context (Up)
        // We create a copy of the customer that has "Base" programs (siblings of this program)
        // But to see siblings, we need to populate the customer's programs array with "Base" programs?
        // Requirement: "from a program... go back up and down... to get sibling programs"
        // So: Program -> CustomerContext -> Programs -> ProgramSibling -> BaseCustomer

        const customerContext = {
          ...custDoc,
          // TODO: HYDRATE CUSTOMER CONTEXT
        } as Customer;

        // Populate siblings for the context
        customerContext.programs = progDocs.map((siblingDoc) => {
          const sibling = {
            ...siblingDoc,
            // TODO: HYDRATE SIBLING PROGRAM
          } as Program;
          sibling.customer = createBaseCustomer(custDoc); // TERMINATOR
          
          // Hydrate services for the sibling program
          const siblingServiceDocs = serviceDocMap.get(siblingDoc.progId) || [];
          sibling.services = siblingServiceDocs.map(servDoc => {
             const siblingService = {
               ...servDoc,
               // TODO: HYDRATE SIBLING SERVICE
             } as Service;
             siblingService.program = createBaseProgram(siblingDoc); // TERMINATOR
             return siblingService;
          });

          return sibling;
        });

        program.customer = customerContext;

        const serviceDocs = serviceDocMap.get(progDoc.progId) || [];

        const services = serviceDocs.map((servDoc) => {
          // 3. Main Service Node
          const service = {
            ...servDoc,
            // TODO: RESOLVE TYPESCRIPT ERRORS HERE BY HYDRATING SERVICE OBJECTS
          } as Service;

          // 3a. Service -> Program Context (Up)
          // Service -> ProgramContext -> Services -> ServiceSibling -> BaseProgram
          const programContext = {
            ...progDoc,
            // TODO: HYDRATE PROGRAM CONTEXT
          } as Program;

          // Populate siblings for the context
          programContext.services = serviceDocs.map((siblingDoc) => {
            const sibling = {
              ...siblingDoc,
              // TODO: HYDRATE SIBLING SERVICE
            } as Service;
            sibling.program = createBaseProgram(progDoc); // TERMINATOR
            return sibling;
          });

          // Link context to its parent (Base) to allow 1 level up?
          // Requirement says "from a service... go back up... to get sibling services".
          // It doesn't explicitly say we need to go from ProgramContext to CustomerContext.
          // But if we did: programContext.customer = createBaseCustomer(custDoc);
          programContext.customer = createBaseCustomer(custDoc);

          service.program = programContext;

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

export const selectPrograms = createSelector(
  [selectTerminatingCustomers],
  (customers) => {
    return customers.flatMap((customer) => customer.programs);
  },
);
