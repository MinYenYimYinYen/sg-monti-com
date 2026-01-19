import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ServCode } from "@/app/realGreen/progServMeta/_lib/types/ServCode";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { ServCodeContract } from "@/app/realGreen/servCode/api/ServCodeContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { Grouper } from "@/lib/Grouper";

export const getServCodes = createAsyncThunk<
  ServCode[], // Return Data Only
  WithConfig<ServCodeContract["getAll"]["params"]>,
  { rejectValue: string }
>(
  "servCode/getServCodes",
  async (params, { rejectWithValue }) => {
    const body: OpMap<ServCodeContract> = {
      op: "getAll",
      ...params,
    };

    const res = await api<ServCodeContract["getAll"]["result"]>(
      "/realGreen/servCode/api",
      {
        method: "POST",
        body,
      },
    );

    if (!res.success) return rejectWithValue(res.message);
    return res.items;
  },
  smartThunkOptions({ typePrefix: "servCode/getServCodes" }),
);

interface ServCodeState {
  servCodes: ServCode[];
}

const initialState: ServCodeState = {
  servCodes: [],
};

const servCodeSlice = createSlice({
  name: "servCode",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getServCodes.fulfilled, (state, action) => {
      state.servCodes = action.payload;
    });
  },
  selectors: {
    allServCodes: (state) => state.servCodes,
    activeServCodes: (state) =>
      state.servCodes.filter((servCode) => servCode.available),
    servCodeMap: (state) =>
      new Grouper(state.servCodes).toUniqueMap((c) => c.servCodeId),
  },
});

export const servCodeActions = { ...servCodeSlice.actions, getServCodes };
export const servCodeSelect = { ...servCodeSlice.selectors };
export default servCodeSlice.reducer;
