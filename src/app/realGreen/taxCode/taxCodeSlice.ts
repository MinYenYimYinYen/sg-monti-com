import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { TaxCode } from "@/app/realGreen/taxCode/TaxCode";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { TaxCodeContract } from "@/app/realGreen/taxCode/api/TaxCodeContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { Grouper } from "@/lib/Grouper";

export const getTaxCodes = createAsyncThunk<
  TaxCode[], // Return Data Only
  WithConfig<TaxCodeContract["getAll"]["params"]>,
  { rejectValue: string }
>(
  "taxCode/getTaxCodes",
  async (params, { rejectWithValue }) => {
    const { showLoading, loadingMsg, ...apiParams } = params;
    const body: OpMap<TaxCodeContract> = {
      op: "getAll",
      ...apiParams,
    };

    const res = await api<TaxCodeContract["getAll"]["result"]>(
      "/realGreen/taxCode/api",
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
  smartThunkOptions({ typePrefix: "taxCode/getTaxCodes" }),
);

interface TaxCodeState {
  taxCodes: TaxCode[];
}

const initialState: TaxCodeState = {
  taxCodes: [],
};

const taxCodeSlice = createSlice({
  name: "taxCode",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getTaxCodes.fulfilled, (state, action) => {
      state.taxCodes = action.payload;
    });
  },
  selectors: {
    allTaxCodes: (state) => state.taxCodes,
    activeTaxCodes: (state) =>
      state.taxCodes.filter((taxCode) => taxCode.available),
    taxCodeMap: (state) =>
      new Grouper(state.taxCodes).toUniqueMap((c) => c.taxCodeId),
  },
});

export const taxCodeActions = { ...taxCodeSlice.actions, getTaxCodes };
export const taxCodeSelect = { ...taxCodeSlice.selectors };
export default taxCodeSlice.reducer;
