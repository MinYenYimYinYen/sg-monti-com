import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProductContract } from "@/app/realGreen/product/api/ProductContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { ProductMasterDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSingleDoc } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductSubDoc } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import {
  ProductCommonDoc,
  ProductCore,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
import { Unit } from "@/app/realGreen/product/_lib/types/UnitTypes";

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

export const saveUnit = createStandardThunk<ProductContract, "saveUnit">({
  typePrefix: "product/saveUnit",
  apiPath: "/realGreen/product/api",
  opName: "saveUnit",
});

interface ProductState {
  productMasterDocs: ProductMasterDoc[];
  productSingleDocs: ProductSingleDoc[];
  productSubDocs: ProductSubDoc[];
  productCommonDocs: ProductCommonDoc[];
}

const initialState: ProductState = {
  productMasterDocs: [],
  productSingleDocs: [],
  productSubDocs: [],
  productCommonDocs: [],
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

      const matchingSubProductDocs = state.productSubDocs.filter(
        (doc) => doc.categoryId === action.payload.categoryId,
      );
      matchingSubProductDocs.forEach((doc) => {
        doc.category = action.payload.newCategory;
      });

      const matchingCommonDocs = state.productCommonDocs.filter(
        (common) => common.categoryId === action.payload.categoryId,
      );
      matchingCommonDocs.forEach((common) => {
        common.category = action.payload.newCategory;
      });
    },
    updateUnit: (state, action: PayloadAction<{ newUnit: Unit }>) => {
      const matchingMasters = state.productMasterDocs.filter(
        (master) => master.unitId === action.payload.newUnit.unitId
      )
      matchingMasters.forEach((master) => {
        master.unit = action.payload.newUnit;
      })
      const matchingSingles = state.productSingleDocs.filter(
        (single) => single.unitId === action.payload.newUnit.unitId
      )
      matchingSingles.forEach((single) => {
        single.unit = action.payload.newUnit;
      })
      const matchingSubs = state.productSubDocs.filter(
        (sub) => sub.unitId === action.payload.newUnit.unitId
      )
      matchingSubs.forEach((sub) => {
        sub.unit = action.payload.newUnit;
      })
      const matchingCommons = state.productCommonDocs.filter(
        (common) => common.unitId === action.payload.newUnit.unitId
      )
      matchingCommons.forEach((common) => {
        common.unit = action.payload.newUnit;
      })
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
      state.productCommonDocs = action.payload.productCommonDocs;
    });
  },
});

export const productActions = {
  ...productSlice.actions,
  getProducts,
  saveCategory,
  saveMasterSubProducts,
  saveUnit,
};
export default productSlice.reducer;
