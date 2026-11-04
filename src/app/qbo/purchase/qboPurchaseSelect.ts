import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { netPurchaseTotal, pickCreditCardPurchases } from "@/app/qbo/purchase/_lib/qboPurchaseUtils";

const selectPurchases = (state: AppState) => state.qboPurchase.purchases;
const selectLoadedRange = (state: AppState) => state.qboPurchase.loadedRange;

const selectPurchaseMap = createSelector([selectPurchases], (purchases) =>
  new Grouper(purchases).toUniqueMap((p) => p.Id),
);

const selectCreditCardPurchases = createSelector([selectPurchases], pickCreditCardPurchases);

const selectCreditCardNetTotal = createSelector([selectCreditCardPurchases], netPurchaseTotal);

export const qboPurchaseSelect = {
  purchases: selectPurchases,
  loadedRange: selectLoadedRange,
  purchaseMap: selectPurchaseMap,
  creditCardPurchases: selectCreditCardPurchases,
  creditCardNetTotal: selectCreditCardNetTotal,
};
