import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/Grouper";
import { progServBaseSelect } from "./progServBaseSelectors";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { ProgCode } from "../types/ProgCodeTypes";
import { ServCode } from "../types/ServCodeTypes";

// Hydrate ProgCodes with Programs from Central
const selectProgCodes = createSelector(
  [progServBaseSelect.basicProgCodes, centralSelect.programs],
  (basicProgCodes, allPrograms) => {
    // Group programs by progDefId for fast lookup
    const programsByDefId = new Grouper(allPrograms)
      .groupBy((p) => p.progDefId)
      .toMap();

    return basicProgCodes.map((basicCode) => {
      const programs = programsByDefId.get(basicCode.progDefId) || [];

      // Create a new object to avoid mutating the basic code
      const richCode: ProgCode = {
        ...basicCode,
        programs,
      };

      // Also need to update the servCodes inside this progCode to point to the new richCode
      // AND hydrate services into servCodes
      // However, servCodes are nested inside progCode.
      // We can't easily update them here without iterating them.
      // But wait, selectServCodes below needs to do this too.

      // Let's hydrate servCodes here as well since they are part of the tree
      // We need services grouped by servCodeId
      // But services are not available here directly, we need to pass them or derive them.
      // Actually, we can just leave servCodes as "Basic" inside the "Rich" ProgCode for now,
      // unless we want full deep hydration.
      // The requirement was "add services: Service[] to ServCodeProps".

      // If we want rich servCodes inside rich progCodes, we need to do it here.
      // But that requires allServices.
      return richCode;
    });
  },
);

// We need a second pass or a combined selector to hydrate services into servCodes
const selectRichProgCodes = createSelector(
  [selectProgCodes, centralSelect.services],
  (progCodes, allServices) => {
    const servicesByCodeId = new Grouper(allServices)
      .groupBy((s) => s.servCodeId)
      .toMap();

    return progCodes.map((progCode) => {
      const richServCodes = progCode.servCodes.map((basicServCode) => {
        const services = servicesByCodeId.get(basicServCode.servCodeId) || [];
        const richServCode: ServCode = {
          ...basicServCode,
          progCode, // Point back to the Rich ProgCode
          services,
        };
        return richServCode;
      });

      // Return new ProgCode with Rich ServCodes
      return {
        ...progCode,
        servCodes: richServCodes,
      };
    });
  },
);

const selectServCodes = createSelector([selectRichProgCodes], (progCodes) => {
  return progCodes.flatMap((p) => p.servCodes);
});

export const progServSelect = {
  progCodeDocs: progServBaseSelect.progCodeDocs,
  progCodes: selectRichProgCodes,
  servCodes: selectServCodes,
};
