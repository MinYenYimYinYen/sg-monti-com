import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { taxCodeSelect } from "@/app/realGreen/taxCode/taxCodeSelectors";
import { MN_TAX_TYPES } from "@/app/salesTax/salesTaxMapping/_lib/mnTaxTypes";
import { buildMappingRows } from "@/app/salesTax/salesTaxMapping/_lib/buildMappingRows";
import { mergeMnTaxTypes } from "@/app/salesTax/salesTaxMapping/_lib/mnTaxTypeLogic";

const selectDocs = (state: AppState) => state.salesTaxMapping.docs;

/** Every RealGreen tax code with its mapping, or none yet. RealGreen is the source of which codes need one. */
const selectRows = createSelector([taxCodeSelect.taxCodes, selectDocs], (taxCodes, docs) =>
  buildMappingRows({ taxCodes, docs }),
);

/**
 * The hardcoded list plus any type that exists only inside a saved mapping, so a definition added
 * once in the dialog is offered again for the next tax code.
 */
const selectKnownMnTaxTypes = createSelector([selectDocs], (docs) =>
  mergeMnTaxTypes({
    primary: MN_TAX_TYPES,
    additional: docs.flatMap((doc) => doc.mnTaxTypes),
  }),
);

export const salesTaxMappingSelect = {
  docs: selectDocs,
  rows: selectRows,
  knownMnTaxTypes: selectKnownMnTaxTypes,
};
