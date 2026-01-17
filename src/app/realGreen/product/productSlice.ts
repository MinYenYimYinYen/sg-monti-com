import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Product } from "@/app/realGreen/product/Product";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { ProductContract } from "@/app/realGreen/product/api/ProductContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { handleError } from "@/lib/errors/errorHandler";
import { Grouper } from "@/lib/Grouper";

export const getProducts = createAsyncThunk<
  ProductContract["getAll"]["result"],
  WithConfig<ProductContract["getAll"]["params"]>,
  { rejectValue: string }
>(
  "product/getProducts",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, ...apiParams } = params;
      const body: OpMap<ProductContract> = {
        op: "getAll",
        ...apiParams,
      };

      return await api<ProductContract["getAll"]["result"]>(
        "/realGreen/product/api",
        {
          method: "POST",
          body,
        },
      );
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "product/getProducts" }),
);

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
      state.products = action.payload.items;
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
