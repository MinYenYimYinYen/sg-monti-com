import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProductContract } from "@/app/realGreen/product/api/ProductContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import {
  ProductMaster,
  ProductMasterDoc,
} from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSingleDoc } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductSubDoc } from "@/app/realGreen/product/_lib/types/ProductSubTypes";

export const getProducts = createStandardThunk<ProductContract, "getAll">({
  typePrefix: "product/getProducts",
  apiPath: "/realGreen/product/api",
  opName: "getAll",
});

export const saveCategory = createStandardThunk<
  ProductContract,
  "saveCategory"
>({
  typePrefix: "product/saveCategory",
  apiPath: "/realGreen/product/api",
  opName: "saveCategory",
});

export const saveMasterSubProducts = createStandardThunk<
  ProductContract,
  "saveMasterSubProducts"
>({
  typePrefix: "product/saveMasterSubProducts",
  apiPath: "/realGreen/product/api",
  opName: "saveMasterSubProducts",
});

interface ProductState {
  productMasterDocs: ProductMasterDoc[];
  productSingleDocs: ProductSingleDoc[];
  productSubDocs: ProductSubDoc[];
}

const initialState: ProductState = {
  productMasterDocs: [],
  productSingleDocs: [],
  productSubDocs: [],
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    updateCategory: (
      state,
      action: PayloadAction<{ categoryId: number; newCategory: string }>,
    ) => {
      const matchingMasters = state.productMasterDocs.filter(
        (master) => master.categoryId === action.payload.categoryId,
      );
      matchingMasters.forEach((master) => {
        master.category = action.payload.newCategory;
      });
      const matchingSingles = state.productSingleDocs.filter(
        (single) => single.categoryId === action.payload.categoryId,
      );
      matchingSingles.forEach((single) => {
        single.category = action.payload.newCategory;
      });
      const matchingDocs = state.productSubDocs.filter(
        (doc) => doc.categoryId === action.payload.categoryId,
      );
      matchingDocs.forEach((doc) => {
        doc.category = action.payload.newCategory;
      });
    },
    updateMasterSubProducts: (
      state,
      action: PayloadAction<{ masterId: number; subProductIds: number[] }>,
    ) => {
      const matchingMaster = state.productMasterDocs.find(
        (master) => master.productId === action.payload.masterId,
      );
      if (matchingMaster) {
        matchingMaster.subProductIds = action.payload.subProductIds;
      }
    },
  },

  extraReducers: (builder) => {
    builder.addCase(getProducts.fulfilled, (state, action) => {
      state.productMasterDocs = action.payload.productMasterDocs;
      state.productSingleDocs = action.payload.productSingleDocs;
      state.productSubDocs = action.payload.productSubDocs;
    });
  },
});

export const productActions = {
  ...productSlice.actions,
  getProducts,
  saveCategory,
  saveMasterSubProducts,
};
export default productSlice.reducer;
