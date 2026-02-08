import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/Grouper";
import { ProgCode } from "../types/ProgCodeTypes";
import { ServCode } from "../types/ServCodeTypes";

export const selectProgCodeDocs = (state: AppState) =>
  state.progServ.progCodeDocs;
export const selectServCodeDocs = (state: AppState) =>
  state.progServ.servCodeDocs;
export const selectProgServs = (state: AppState) => state.progServ.progServs;

// Group ProgServ links by Program Definition ID for fast lookup
export const selectProgServMap = createSelector(
  [selectProgServs],
  (progServs) => {
    return new Grouper(progServs).groupBy((ps) => ps.progDefId).toMap();
  },
);

// Map Service Codes by ID for fast lookup
export const selectServCodeMap = createSelector(
  [selectServCodeDocs],
  (servCodeDocs) => {
    return new Grouper(servCodeDocs).toUniqueMap((s) => s.servCodeId);
  },
);

export const selectBasicProgCodes = createSelector(
  [selectProgCodeDocs, selectProgServMap, selectServCodeMap],
  (progCodeDocs, progServMap, servCodeMap) => {
    // 1. Hydrate all programs
    const progCodes: ProgCode[] = progCodeDocs.map((progDoc) => {
      const progServLinks = progServMap.get(progDoc.progDefId) || [];

      // Logic from _hydrateProgCodes: isSpecial if there is exactly one link
      // and that link's service code ID matches the program code ID.
      const isSpecial =
        progServLinks.length === 1 &&
        progServLinks[0].servCodeId === progDoc.progCodeId;

      const progCode: ProgCode = {
        ...progDoc,
        isSpecial,
        servCodes: [],
        programs: [], // Initialize empty
      };

      const servCodes: ServCode[] = progServLinks
        .map((link) => {
          if (!link.servCodeId) return null;

          const servDoc = servCodeMap.get(link.servCodeId);
          if (!servDoc) return null;
          const servCode: ServCode = {
            ...servDoc,
            progCode,
            progCodeId: progCode.progCodeId,
            services: [], // Initialize empty
            isSpecial: progCode.progCodeId === link.servCodeId,
          };

          return servCode;
        })
        .filter((s): s is ServCode => s !== null)
        .sort((a, b) => a.servCodeId.localeCompare(b.servCodeId));

      progCode.servCodes = servCodes;

      return progCode;
    });

    // 2. Filter out nested programs (programs that appear as services in other programs)
    const allProgIds = new Set(progCodes.map((p) => p.progCodeId));
    const programCodesToFilterOut = new Set<string>();

    for (const programCode of progCodes) {
      for (const serv of programCode.servCodes) {
        // If a service code is also a known program code (and not the program itself),
        // it means that program is nested inside this one.
        if (
          allProgIds.has(serv.servCodeId) &&
          serv.servCodeId !== programCode.progCodeId
        ) {
          programCodesToFilterOut.add(serv.servCodeId);
        }
      }
    }

    return progCodes.filter((p) => !programCodesToFilterOut.has(p.progCodeId));
  },
);

export const selectBasicServCodes = createSelector(
  [selectBasicProgCodes],
  (progCodes) => {
    return progCodes.flatMap((p) => p.servCodes);
  },
);

export const progServBaseSelect = {
  progCodeDocs: selectProgCodeDocs,
  servCodeDocs: selectServCodeDocs,
  progServs: selectProgServs,
  progServMap: selectProgServMap,
  servCodeMap: selectServCodeMap,
  basicProgCodes: selectBasicProgCodes,
  basicServCodes: selectBasicServCodes,
};
