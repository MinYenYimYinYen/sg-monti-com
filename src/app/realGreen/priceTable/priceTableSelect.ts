import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { PriceTable } from "@/app/realGreen/priceTable/_types/PriceTableTypes";

const selectPriceTableDocs = (state: AppState) =>
  state.priceTable.priceTableDocs;

const selectPriceTables = createSelector(
  [selectPriceTableDocs],
  (priceTableDocs) => {
    const priceTables = priceTableDocs.map((ptDoc) => {
      const priceTable: PriceTable = {
        ...ptDoc,
      };
      return priceTable;
    });
    return priceTables;
  },
);

const selectPriceTableMap = createSelector([selectPriceTables], (priceTables) =>
  new Grouper(priceTables).toUniqueMap((pt) => pt.priceTableId),
);

export const priceTableSelect = {
  priceTables: selectPriceTables,
  priceTableMap: selectPriceTableMap,
};
