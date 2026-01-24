import { createSelector } from "@reduxjs/toolkit";
import { Customer } from "../_lib/entities/types/CustomerTypes";
import { Program } from "../_lib/entities/types/ProgramTypes";
import { Service } from "../_lib/entities/types/ServiceTypes";
import { Grouper } from "@/lib/Grouper";
import { BaseCustomerState } from "@/app/realGreen/customer/slices/SliceTypes";
import { AppState } from "@/store";
import { progServSelect } from "@/app/realGreen/progServ/_selectors/progServSelectors";
import { baseServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { baseProgram } from "../_lib/entities/bases/ProgramBase";
import { baseCustomer } from "../_lib/entities/bases/CustomerBase";
import { baseProgCode } from "../../progServ/_lib/types/ProgCodeTypes";

/**
 * Factory to create the Base Tree Selector.
 * Injects global metadata (ServCodes) into the hydration process.
 */
export const createSelectBaseTree = (
  selectSlice: (state: AppState) => BaseCustomerState,
) =>
  createSelector(
    [selectSlice, progServSelect.servCodeMap, progServSelect.progCodeByDefIdMap],
    (slice, servCodeMap, progCodeByDefIdMap) => {
      const { customerDocs, programDocs, serviceDocs } = slice;

      // Group Services by ProgId
      const servicesByProgId = new Grouper(serviceDocs)
        .groupBy((s) => s.progId)
        .toMap();

      // We iterate programDocs to build the hydrated Programs first
      const hydratedPrograms = programDocs.map((p): Program => ({
        ...p,
        progCode: progCodeByDefIdMap.get(p.progDefId) || baseProgCode,
        services: (servicesByProgId.get(p.progId) || []).map((s) => ({
          ...s,
          // Hydrate ServCode metadata
          servCode: servCodeMap.get(s.servCodeId) || baseServCode,
          // Default to baseProgram for now (overwritten in Context Selectors)
          program: baseProgram,
        })),
        // Default to baseCustomer for now (overwritten in Context Selectors)
        customer: baseCustomer,
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
 * Factory to create the Context Services Selector.
 */
export const createSelectServices = (
  selectSlice: (state: AppState) => BaseCustomerState,
) => {
  const selectBaseTree = createSelectBaseTree(selectSlice);

  return createSelector([selectBaseTree], (baseCustomers): Service[] => {
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
  });
};

/**
 * Factory to create the Context Programs Selector.
 */
export const createSelectPrograms = (
  selectSlice: (state: AppState) => BaseCustomerState,
) => {
  const selectBaseTree = createSelectBaseTree(selectSlice);

  return createSelector([selectBaseTree], (baseCustomers): Program[] => {
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
  });
};

/**
 * Factory to create the Context Customers Selector.
 */
export const createSelectCustomers = (
  selectSlice: (state: AppState) => BaseCustomerState,
) => createSelectBaseTree(selectSlice);
