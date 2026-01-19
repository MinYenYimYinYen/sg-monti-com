import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { CallAhead } from "@/app/realGreen/callAhead/CallAhead";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { CallAheadContract } from "@/app/realGreen/callAhead/api/CallAheadContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { Grouper } from "@/lib/Grouper";

export const getCallAheads = createAsyncThunk<
  CallAhead[],
  WithConfig<CallAheadContract["getAll"]["params"]>,
  { rejectValue: string }
>(
  "callAhead/getCallAheads",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<CallAheadContract> = {
      op: "getAll",
      ...params,
    };

    const res = await api<CallAheadContract["getAll"]["result"]>(
      "/realGreen/callAhead/api",
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
      state.callAheads = action.payload;
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
