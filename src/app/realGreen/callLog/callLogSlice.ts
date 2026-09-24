import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CallLogContract } from "@/app/realGreen/callLog/api/CallLogContract";
import { CallLogCore } from "@/app/realGreen/callLog/CallLogTypes";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

type CallLogState = {
  callLogCores: CallLogCore[];
};

const initialState: CallLogState = {
  callLogCores: [],
};

export const getCallLogsForCustomer = createStandardThunk<
  CallLogContract,
  "getCallLogsForCustomer"
>({
  typePrefix: "callLog/getCallLogsForCustomer",
  apiPath: "/realGreen/callLog/api",
  opName: "getCallLogsForCustomer",
});

const callLogSlice = createSlice({
  name: "callLog",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getCallLogsForCustomer.fulfilled, (state, action) => {
      // Merge incoming cores with existing state, deduplicating by callLogId.
      // Incoming cores take precedence (they are fresher from the API).
      const incomingMap = new Grouper(action.payload).toUniqueMap(
        (d) => d.callLogId,
      );
      const merged = state.callLogCores.map((existing) =>
        incomingMap.get(existing.callLogId) ?? existing,
      );
      const existingIds = new Set(state.callLogCores.map((d) => d.callLogId));
      const newCores = action.payload.filter((d) => !existingIds.has(d.callLogId));
      state.callLogCores = [...merged, ...newCores];
    });
  },
});

export const callLogReducer = callLogSlice.reducer;
export const callLogActions = {
  ...callLogSlice.actions,
  getCallLogsForCustomer,
};
