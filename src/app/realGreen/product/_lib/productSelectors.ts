import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/Grouper";

const selectProductMasterDocs = (state: AppState) =>
  state.product.productMasterDocs;
const selectProductSingleDocs = (state: AppState) =>
  state.product.productSingleDocs;
const selectProductDocs = (state: AppState) => state.product.productDocs;

  //todo: Leaving off here. To this point, category is hard-coded as baseProductCategory.
  // Not the standard flow, but this is because realGreen left a hole in their API.
  // Below: All of the product types need to check for their categories.
  // If not present, they can keep baseCategory.
  // Then we need to find a way to handle the missing categories.
  // Actually it would have been better not to make a slice for categories.
  // This should have been handled in the api route.
  // So delete all that crap except for the model definition.
  // Route should do as follows:
  // 1. find categories and Map them. DONE
  // 2. products find their categories and add them to the product. DONE
  // 3. For missing categories, add baseCategory. DONE
  // 3.5 Add a tab trigger IF there are missing categories.
  // 4. Missing Categories groups products by categoryId (from ProductCore)
  // 4.5 Having them grouped makes it obvious to user what category is missing.
  // 4.75 User inputs a categoryName - update state, enable save changes. Post Category to mongo.
  // 5. For products with <null> category, define category, update state, and post to mongo.
  // That should handle the category problem.  We'll have to do the same thing for units.

// Derive subs from cores and master relationships
const selectProductSubDocs = createSelector(
  [selectProductMasterDocs, selectProductDocs],
  (masters, cores) => {
    const allSubIds = new Set(masters.flatMap((m) => m.subProductIds));
    return cores.filter((c) => allSubIds.has(c.productId));
  },
);

const selectMasterMap = createSelector(
  [selectProductMasterDocs],
  (masters) => new Map(masters.map((m) => [m.productId, m])),
);

const selectSingleMap = createSelector(
  [selectProductSingleDocs],
  (singles) => new Map(singles.map((s) => [s.productId, s])),
);

const selectCoreMap = createSelector(
  [selectProductDocs],
  (cores) => new Map(cores.map((c) => [c.productId, c])),
);

export const productSelect = {
  productMasterDocs: selectProductMasterDocs,
  productSingleDocs: selectProductSingleDocs,
  productDocs: selectProductDocs,
  productSubDocs: selectProductSubDocs, // Derived selector
  masterMap: selectMasterMap,
  singleMap: selectSingleMap,
  coreMap: selectCoreMap,
};
