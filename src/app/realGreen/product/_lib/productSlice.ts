import { createSlice } from "@reduxjs/toolkit";
import {
  ProductCore,
  ProductMasterDoc,
  ProductSingleDoc,
} from "@/app/realGreen/product/_lib/ProductTypes";
import { ProductContract } from "@/app/realGreen/product/api/ProductContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

export const getProducts = createStandardThunk<ProductContract, "getAll">({
  typePrefix: "product/getProducts",
  apiPath: "/realGreen/product/api",
  opName: "getAll",
});

interface ProductState {
  productMasterDocs: ProductMasterDoc[];
  productSingleDocs: ProductSingleDoc[];
  productCores: ProductCore[];
}

const initialState: ProductState = {
  productMasterDocs: [],
  productSingleDocs: [],
  productCores: [],
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getProducts.fulfilled, (state, action) => {
      state.productMasterDocs = action.payload.productMasterDocs;
      state.productSingleDocs = action.payload.productSingleDocs;
      state.productCores = action.payload.productCores;
    });
  },
});

export const productActions = { ...productSlice.actions, getProducts };
export default productSlice.reducer;
