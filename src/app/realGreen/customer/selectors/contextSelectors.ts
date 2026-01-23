import { createSelector } from "@reduxjs/toolkit";
import {
  Customer,
  CustomerSliceState,
} from "../_lib/types/entities/Customer";
import { Program, ProgramSliceState } from "../_lib/types/entities/Program";
import { Service, ServiceSliceState } from "../_lib/types/entities/Service";
import { Grouper } from "@/lib/Grouper";

// Combine all slice requirements
type ContextSelectorState = CustomerSliceState &
  ProgramSliceState &
  ServiceSliceState;

const getCustomerDocs = (state: ContextSelectorState) => state.customerDocs;
const getProgramDocs = (state: ContextSelectorState) => state.programDocs;
const getServiceDocs = (state: ContextSelectorState) => state.serviceDocs;

/**
 * 1. Build the "Base Tree" (Top-Down Only)
 * Customer -> Programs -> Services
 * No upward pointers to avoid cycles during construction.
 */
const selectBaseTree = createSelector(
  [getCustomerDocs, getProgramDocs, getServiceDocs],
  (customerDocs, programDocs, serviceDocs) => {
    // Group Services by ProgId
    const servicesByProgId = new Grouper(serviceDocs)
      .groupBy((s) => s.progId)
      .toMap();

    // Group Programs by CustId
    // And hydrate them with Services immediately
    const programsByCustId = new Map<number, Program[]>();

    // We iterate programDocs to build the hydrated Programs first
    const hydratedPrograms = programDocs.map((p): Program => ({
      ...p,
      services: servicesByProgId.get(p.progId) || [],
      // No customer pointer yet
    }));

    // Now group these hydrated programs
    const groupedPrograms = new Grouper(hydratedPrograms)
      .groupBy((p) => p.custId)
      .toMap();

    // Hydrate Customers with Programs
    const hydratedCustomers = customerDocs.map((c): Customer => ({
      ...c,
      programs: groupedPrograms.get(c.custId) || [],
    }));

    return hydratedCustomers;
  },
);

/**
 * 2. Select Context Services
 * Returns Services with upward pointers to the Base Tree.
 *
 * Structure:
 * Service
 *  -> program (BaseProgram)
 *      -> services (Siblings)
 *      -> customer (BaseCustomer)
 *          -> programs (Cousins)
 */
export const selectContextServices = createSelector(
  [selectBaseTree],
  (baseCustomers): Service[] => {
    const contextServices: Service[] = [];

    for (const customer of baseCustomers) {
      for (const program of customer.programs) {
        // We need to attach the customer to the program for the "upward" link to work
        // But we must be careful not to mutate the original 'program' object in the tree if it's frozen
        // However, since we just created these objects in selectBaseTree, they are new references.
        // To be safe and immutable-friendly, we create a "Context Program" wrapper.

        const contextProgram: Program = {
          ...program,
          customer: customer, // Point up to Base Customer
        };

        for (const service of program.services) {
          const contextService: Service = {
            ...service,
            program: contextProgram, // Point up to Context Program
          };
          contextServices.push(contextService);
        }
      }
    }

    return contextServices;
  },
);

/**
 * 3. Select Context Programs
 * Returns Programs with upward pointers to the Base Tree.
 *
 * Structure:
 * Program
 *  -> services (Children)
 *  -> customer (BaseCustomer)
 *      -> programs (Siblings)
 */
export const selectContextPrograms = createSelector(
  [selectBaseTree],
  (baseCustomers): Program[] => {
    const contextPrograms: Program[] = [];

    for (const customer of baseCustomers) {
      for (const program of customer.programs) {
        const contextProgram: Program = {
          ...program,
          customer: customer, // Point up to Base Customer
        };
        contextPrograms.push(contextProgram);
      }
    }

    return contextPrograms;
  },
);

/**
 * 4. Select Context Customers
 * This is effectively the same as the Base Tree, but exported for consistency.
 */
export const selectContextCustomers = selectBaseTree;
