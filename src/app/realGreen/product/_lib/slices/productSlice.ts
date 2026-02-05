import { createSlice } from "@reduxjs/toolkit";
import {
  ProductCore,
  ProductDoc,
  ProductMasterDoc,
  ProductSingleDoc,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
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
  productDocs: ProductDoc[];
}

const initialState: ProductState = {
  productMasterDocs: [],
  productSingleDocs: [],
  productDocs: [],
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getProducts.fulfilled, (state, action) => {
      state.productMasterDocs = action.payload.productMasterDocs;
      state.productSingleDocs = action.payload.productSingleDocs;
      state.productDocs = action.payload.productDocs;
    });
  },
});

export const productActions = { ...productSlice.actions, getProducts };
export default productSlice.reducer;
