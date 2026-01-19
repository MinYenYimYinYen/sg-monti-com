import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { PriceTable } from "@/app/realGreen/priceTable/PriceTable";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { PriceTableContract } from "@/app/realGreen/priceTable/api/PriceTableContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { Grouper } from "@/lib/Grouper";

export const getPriceTables = createAsyncThunk<
  PriceTable[],
  WithConfig<PriceTableContract["getAll"]["params"]>,
  { rejectValue: string }
>(
  "priceTable/getPriceTables",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<PriceTableContract> = {
      op: "getAll",
      ...params,
    };

    const res = await api<PriceTableContract["getAll"]["result"]>(
      "/realGreen/priceTable/api",
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
  smartThunkOptions({ typePrefix: "priceTable/getPriceTables" }),
);

interface PriceTableState {
  priceTables: PriceTable[];
}

const initialState: PriceTableState = {
  priceTables: [],
};

const priceTableSlice = createSlice({
  name: "priceTable",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getPriceTables.fulfilled, (state, action) => {
      state.priceTables = action.payload;
    });
  },
  selectors: {
    allPriceTables: (state) => state.priceTables,
    activePriceTables: (state) =>
      state.priceTables.filter((priceTable) => priceTable.available),
    priceTableMap: (state) =>
      new Grouper(state.priceTables).toUniqueMap((c) => c.id),
  },
});

export const priceTableActions = { ...priceTableSlice.actions, getPriceTables };
export const priceTableSelect = { ...priceTableSlice.selectors };
export default priceTableSlice.reducer;
