import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { CallAhead } from "@/app/realGreen/callAhead/CallAhead";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { CallAheadContract } from "@/app/realGreen/callAhead/api/CallAheadContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { handleError } from "@/lib/errors/errorHandler";
import { Grouper } from "@/lib/Grouper";

export const getCallAheads = createAsyncThunk<
  CallAheadContract["getAll"]["result"],
  WithConfig<CallAheadContract["getAll"]["params"]>,
  { rejectValue: string }
>(
  "callAhead/getCallAheads",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, ...apiParams } = params;
      const body: OpMap<CallAheadContract> = {
        op: "getAll",
        ...apiParams,
      };

      return await api<CallAheadContract["getAll"]["result"]>(
        "/realGreen/callAhead/api",
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
  smartThunkOptions({ typePrefix: "callAhead/getCallAheads" }),
);

interface CallAheadState {
  callAheads: CallAhead[];
}

const initialState: CallAheadState = {
  callAheads: [],
};

const callAheadSlice = createSlice({
  name: "callAhead",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getCallAheads.fulfilled, (state, action) => {
      state.callAheads = action.payload.items;
    });
  },
  selectors: {
    allCallAheads: (state) => state.callAheads,
    activeCallAheads: (state) =>
      state.callAheads.filter((callAhead) => callAhead.available),
    callAheadMap: (state) =>
      new Grouper(state.callAheads).toUniqueMap((c) => c.callAheadId),
  },
});

export const callAheadActions = { ...callAheadSlice.actions, getCallAheads };
export const callAheadSelect = { ...callAheadSlice.selectors };
export default callAheadSlice.reducer;
