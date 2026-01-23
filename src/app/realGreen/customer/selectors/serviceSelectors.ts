import { createSelector } from "@reduxjs/toolkit";
import { Service, ServiceSliceState } from "../_lib/types/entities/Service";
import { selectStubPrograms } from "./stubSelectors";
import { ProgramSliceState } from "../_lib/types/entities/Program";

// We need ProgramSliceState because selectStubPrograms depends on it
type ServiceSelectorState = ServiceSliceState & ProgramSliceState;

const getServiceDocs = (state: ServiceSelectorState) => state.serviceDocs;

export const selectRichServices = createSelector(
  [getServiceDocs, selectStubPrograms],
  (serviceDocs, stubPrograms): Service[] => {
    const programsById = new Map(stubPrograms.map((p) => [p.progId, p]));

    return serviceDocs.map((s) => ({
      ...s,
      program: programsById.get(s.progId), // Attach Stub Parent
    }));
  },
);
