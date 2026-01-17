import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ZipCode } from "@/app/realGreen/zipCode/ZipCode";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { ZipCodeContract } from "@/app/realGreen/zipCode/api/ZipCodeContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { handleError } from "@/lib/errors/errorHandler";
import { Grouper } from "@/lib/Grouper";

export const getZipCodes = createAsyncThunk<
  ZipCodeContract["getAll"]["result"],
  WithConfig<ZipCodeContract["getAll"]["params"]>,
  { rejectValue: string }
>(
  "zipCode/getZipCodes",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, ...apiParams } = params;
      const body: OpMap<ZipCodeContract> = {
        op: "getAll",
        ...apiParams,
      };

      return await api<ZipCodeContract["getAll"]["result"]>(
        "/realGreen/zipCode/api",
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
      state.zipCodes = action.payload.items;
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
