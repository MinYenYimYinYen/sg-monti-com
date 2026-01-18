import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ZipCode } from "@/app/realGreen/zipCode/ZipCode";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { ZipCodeContract } from "@/app/realGreen/zipCode/api/ZipCodeContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { Grouper } from "@/lib/Grouper";

export const getZipCodes = createAsyncThunk<
  ZipCode[], // Return Data Only
  WithConfig<ZipCodeContract["getAll"]["params"]>,
  { rejectValue: string }
>(
  "zipCode/getZipCodes",
  async (params, { rejectWithValue }) => {
    const { showLoading, loadingMsg, ...apiParams } = params;
    const body: OpMap<ZipCodeContract> = {
      op: "getAll",
      ...apiParams,
    };

    const res = await api<ZipCodeContract["getAll"]["result"]>(
      "/realGreen/zipCode/api",
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
  smartThunkOptions({ typePrefix: "zipCode/getZipCodes" }),
);

interface ZipCodeState {
  zipCodes: ZipCode[];
}

const initialState: ZipCodeState = {
  zipCodes: [],
};

const zipCodeSlice = createSlice({
  name: "zipCode",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getZipCodes.fulfilled, (state, action) => {
      state.zipCodes = action.payload;
    });
  },
  selectors: {
    allZipCodes: (state) => state.zipCodes,
    zipCodeMap: (state) =>
      new Grouper(state.zipCodes).toUniqueMap((c) => c.zip),
  },
});

export const zipCodeActions = { ...zipCodeSlice.actions, getZipCodes };
export const zipCodeSelect = { ...zipCodeSlice.selectors };
export default zipCodeSlice.reducer;
