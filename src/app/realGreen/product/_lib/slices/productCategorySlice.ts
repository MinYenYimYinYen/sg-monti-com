import { createSlice } from "@reduxjs/toolkit";
import { ProductCategory } from "@/app/realGreen/product/_lib/types/ProductCategoryTypes";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { ProductContract } from "@/app/realGreen/product/api/ProductContract";

const getProductCategories = createStandardThunk<
  ProductContract,
  "getCategories"
>({
  typePrefix: "productCategory/getProductCategories",
  apiPath: "/realGreen/productCategory/api",
  opName: "getCategories",
});

type ProductCategoryState = {
  productCategories: ProductCategory[];
};

const initialState: ProductCategoryState = {
  productCategories: [],
};

export const productCategorySlice = createSlice({
  name: "productCategory",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getProductCategories.fulfilled, (state, action) => {
      state.productCategories = action.payload;
    });
  },
});

export default productCategorySlice.reducer;
export const productCategoryActions = {
  ...productCategorySlice.actions,
  getProductCategories,
};
