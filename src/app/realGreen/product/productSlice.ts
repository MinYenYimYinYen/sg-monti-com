import { createSlice } from "@reduxjs/toolkit";
import { Product } from "@/app/realGreen/product/Product";
import { ProductContract } from "@/app/realGreen/product/api/ProductContract";
import { Grouper } from "@/lib/Grouper";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

export const getProducts = createStandardThunk<ProductContract, "getAll">({
  typePrefix: "product/getProducts",
  apiPath: "/realGreen/product/api",
  opName: "getAll",
});

interface ProductState {
  products: Product[];
}

const initialState: ProductState = {
  products: [],
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getProducts.fulfilled, (state, action) => {
      state.products = action.payload;
    });
  },
  selectors: {
    allProducts: (state) => state.products,
    productMap: (state) =>
      new Grouper(state.products).toUniqueMap((c) => c.productId),
  },
});

export const productActions = { ...productSlice.actions, getProducts };
export const productSelect = { ...productSlice.selectors };
export default productSlice.reducer;
