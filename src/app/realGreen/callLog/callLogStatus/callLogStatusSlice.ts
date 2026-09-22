import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CallLogStatusContract } from "@/app/realGreen/callLog/callLogStatus/api/CallLogStatusContract";
import { CallLogStatus } from "@/app/realGreen/callLog/callLogStatus/CallLogStatusTypes";

type CallLogStatusState = {
  callLogStatuses: CallLogStatus[];
};

const initialState: CallLogStatusState = {
  callLogStatuses: [],
};

export const getCallLogStatuses = createStandardThunk<CallLogStatusContract, "getAll">({
  typePrefix: "callLogStatus/getAll",
  apiPath: "/realGreen/callLog/callLogStatus/api",
  opName: "getAll",
});

export const upsertCallLogStatus = createStandardThunk<CallLogStatusContract, "upsert">({
  typePrefix: "callLogStatus/upsert",
  apiPath: "/realGreen/callLog/callLogStatus/api",
  opName: "upsert",
});

export const deleteCallLogStatus = createStandardThunk<CallLogStatusContract, "delete">({
  typePrefix: "callLogStatus/delete",
  apiPath: "/realGreen/callLog/callLogStatus/api",
  opName: "delete",
});

const callLogStatusSlice = createSlice({
  name: "callLogStatus",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getCallLogStatuses.fulfilled, (state, action) => {
      state.callLogStatuses = action.payload;
    });

    builder.addCase(upsertCallLogStatus.fulfilled, (state, action) => {
      const upserted = action.payload;
      const idx = state.callLogStatuses.findIndex((s) => s.code === upserted.code);
      if (idx >= 0) {
        state.callLogStatuses[idx] = upserted;
      } else {
        state.callLogStatuses.push(upserted);
      }
    });

  },
});

export const callLogStatusReducer = callLogStatusSlice.reducer;
export const callLogStatusActions = {
  ...callLogStatusSlice.actions,
  getCallLogStatuses,
  upsertCallLogStatus,
  deleteCallLogStatus,
};
