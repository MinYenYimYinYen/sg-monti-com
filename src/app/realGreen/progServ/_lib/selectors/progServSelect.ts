import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { ProgCode } from "../types/ProgCodeTypes";
import { ServCode } from "../types/ServCodeTypes";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { hydrateProductRules } from "./hydrateProductRules";
import { hydrateAssignedTo } from "./hydrateAssignedTo";
import { priceTableSelect } from "@/app/realGreen/priceTable/priceTableSelect";
import { buildProgCode } from "@/app/realGreen/progServ/_lib/buildProgCode";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

const selectProgCodeDocs = (state: AppState) => state.progServ.progCodeDocs;
const selectServCodeDocs = (state: AppState) => state.progServ.servCodeDocs;
const selectProgServs = (state: AppState) => state.progServ.progServs;

const selectProgServMap = createSelector([selectProgServs], (progServs) => {
  return new Grouper(progServs).groupBy((ps) => ps.progDefId).toMap();
});

const selectServCodeDocMap = createSelector(
  [selectServCodeDocs],
  (servCodeDocs) => {
    return new Grouper(servCodeDocs).toUniqueMap((s) => s.servCodeId);
  },
);

const selectProgCodes = createSelector(
  [
    selectProgCodeDocs,
    selectProgServMap,
    selectServCodeDocMap,
    productSelect.productMastersMap,
    priceTableSelect.priceTableMap,
    assignmentPlanSelect.assignmentsByServCodeId,
    employeeSelect.employeeMap,
  ],
  (
    progCodeDocs,
    progServMap,
    servCodeDocMap,
    productMasterMap,
    priceTableMap,
    assignmentsByServCodeId,
    employeeMap,
  ) => {
    const progCodes: ProgCode[] = progCodeDocs.map((progDoc) => {
      const progServLinks = progServMap.get(progDoc.progDefId) || [];

      const isSpecial =
        progServLinks.length === 1 &&
        progServLinks[0].servCodeId === progDoc.progCodeId;

      const priceTable =
        (progDoc.prefPriceTableId != null
          ? priceTableMap.get(progDoc.prefPriceTableId)
          : null) ?? null;

      const econPriceTable =
        (progDoc.econPriceTableId != null
          ? priceTableMap.get(progDoc.econPriceTableId)
          : null) ?? null;

      // Resolve all external data before calling buildProgCode
      const servCodeDatas: Omit<ServCode, "progCode" | "x">[] = progServLinks
        .map((link) => {
          if (!link.servCodeId) return null;

          const servDoc = servCodeDocMap.get(link.servCodeId);
          if (!servDoc) return null;

          const plan = assignmentsByServCodeId.get(link.servCodeId);
          const assignedTo =
            plan && plan.employeeIds.length > 0
              ? hydrateAssignedTo(plan.employeeIds, employeeMap)
              : [];

          const servData: Omit<ServCode, "progCode" | "x"> = {
            ...servDoc,
            progCodeId: progDoc.progCodeId,
            isSpecial: progDoc.progCodeId === link.servCodeId,
            productRules: hydrateProductRules(
              servDoc.productRuleDocs,
              productMasterMap,
            ),
            assignedTo,
          };

          return servData;
        })
        .filter((s): s is Omit<ServCode, "progCode" | "x"> => s !== null)
        .sort((a, b) => a.servCodeId.localeCompare(b.servCodeId));

      const progCodeData: Omit<ProgCode, "servCodes" | "x"> = {
        ...progDoc,
        isSpecial,
        priceTable,
        econPriceTable,
      };

      return buildProgCode(progCodeData, servCodeDatas);
    });

    // Filter out nested programs (programs that appear as services in other programs)
    const allProgIds = new Set(progCodes.map((p) => p.progCodeId));
    const programCodesToFilterOut = new Set<string>();

    for (const programCode of progCodes) {
      for (const serv of programCode.servCodes) {
        if (
          allProgIds.has(serv.servCodeId) &&
          serv.servCodeId !== programCode.progCodeId
        ) {
          programCodesToFilterOut.add(serv.servCodeId);
        }
      }
    }

    return progCodes.filter((p) => !programCodesToFilterOut.has(p.progCodeId)).filter((p) => p.servCodes.length > 0);
  },
);

const selectProgCodeMap = createSelector([selectProgCodes], (progCodes) =>
  new Grouper(progCodes).toUniqueMap((p) => p.progCodeId),
);

const selectServCodes = createSelector([selectProgCodes], (progCodes) => {
  return progCodes.flatMap((p) => p.servCodes);
});

const selectServCodeMap = createSelector([selectServCodes], (servCodes) => {
  return new Grouper(servCodes).toUniqueMap((s) => s.servCodeId);
});

export const progServSelect = {
  progCodeDocs: selectProgCodeDocs,
  servCodeDocs: selectServCodeDocs,
  progServMap: selectProgServMap,
  servCodeDocMap: selectServCodeDocMap,
  progCodes: selectProgCodes,
  progCodeMap: selectProgCodeMap,
  servCodes: selectServCodes,
  servCodeMap: selectServCodeMap,
};
