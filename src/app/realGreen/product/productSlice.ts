import { createSlice } from "@reduxjs/toolkit";
import { ProductDoc } from "@/app/realGreen/product/ProductTypes";
import { ProductContract } from "@/app/realGreen/product/api/ProductContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

export const getProducts = createStandardThunk<ProductContract, "getAll">({
  typePrefix: "product/getProducts",
  apiPath: "/realGreen/product/api",
  opName: "getAll",
});

interface ProductState {
  productDocs: ProductDoc[];
}

const initialState: ProductState = {
  productDocs: [],
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getProducts.fulfilled, (state, action) => {
      state.productDocs = action.payload;
    });
  },
});

export const productActions = { ...productSlice.actions, getProducts };
export default productSlice.reducer;
