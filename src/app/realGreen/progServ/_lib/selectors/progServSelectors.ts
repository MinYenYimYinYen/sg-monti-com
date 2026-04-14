import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { ProgCode } from "../types/ProgCodeTypes";
import { ServCode } from "../types/ServCodeTypes";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { hydrateProductRules } from "./hydrateProductRules";
import { priceTableSelect } from "@/app/realGreen/priceTable/priceTableSelect";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";

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
  ],
  (
    progCodeDocs,
    progServMap,
    servCodeDocMap,
    productMasterMap,
    priceTableMap,
  ) => {
    // Builder type for type-safe construction before the circle closes
    type ProgCodeBuilder = Omit<ProgCode, "servCodes"> & {
      servCodes: ServCode[];
    };

    const progCodes: ProgCode[] = progCodeDocs.map((progDoc) => {
      const progServLinks = progServMap.get(progDoc.progDefId) || [];

      const isSpecial =
        progServLinks.length === 1 &&
        progServLinks[0].servCodeId === progDoc.progCodeId;

      const priceTable =
        priceTableMap.get(progDoc.priceTableId ?? baseNumId) ?? null;

      const econPriceTable =
        priceTableMap.get(progDoc.econPriceTableId ?? baseNumId) ?? null;

      // Phase 1: Build progCode with empty servCodes
      const progCodeBuilder: ProgCodeBuilder = {
        ...progDoc,
        isSpecial,
        servCodes: [],
        priceTable,
        econPriceTable,
      };

      // Phase 2: Build servCodes referencing the progCode builder
      const servCodes: ServCode[] = progServLinks
        .map((link) => {
          if (!link.servCodeId) return null;

          const servDoc = servCodeDocMap.get(link.servCodeId);
          if (!servDoc) return null;

          const servCode: ServCode = {
            ...servDoc,
            progCode: progCodeBuilder as ProgCode,
            progCodeId: progCodeBuilder.progCodeId,
            services: [],
            isSpecial: progCodeBuilder.progCodeId === link.servCodeId,
            productRules: hydrateProductRules(
              servDoc.productRuleDocs,
              productMasterMap,
            ),
          };

          return servCode;
        })
        .filter((s): s is ServCode => s !== null)
        .sort((a, b) => a.servCodeId.localeCompare(b.servCodeId));

      // Mutate servCodes in place to close the circle — servCode.progCode.servCodes is now populated
      progCodeBuilder.servCodes = servCodes;

      return progCodeBuilder as ProgCode;
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

    return progCodes.filter((p) => !programCodesToFilterOut.has(p.progCodeId));
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
