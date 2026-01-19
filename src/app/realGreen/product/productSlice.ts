import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Product } from "@/app/realGreen/product/Product";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { ProductContract } from "@/app/realGreen/product/api/ProductContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { Grouper } from "@/lib/Grouper";

export const getProducts = createAsyncThunk<
  Product[],
  WithConfig<ProductContract["getAll"]["params"]>,
  { rejectValue: string }
>(
  "product/getProducts",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<ProductContract> = {
      op: "getAll",
      ...params,
    };

    const res = await api<ProductContract["getAll"]["result"]>(
      "/realGreen/product/api",
      {
        method: "POST",
        body,
      },
    );

    if (!res.success) {
      return rejectWithValue(res.message);
    }

    return res.items;
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
