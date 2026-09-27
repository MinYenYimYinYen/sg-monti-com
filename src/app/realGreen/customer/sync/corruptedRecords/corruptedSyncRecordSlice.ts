import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CorruptedSyncRecordContract } from "@/app/realGreen/customer/sync/corruptedRecords/CorruptedSyncRecordContract";
import { CorruptedSyncRecord } from "@/app/realGreen/customer/sync/corruptedRecords/CorruptedSyncRecordTypes";

type CorruptedSyncRecordState = {
  corruptedSyncRecords: CorruptedSyncRecord[];
  selectedSeason: number;
};

const initialState: CorruptedSyncRecordState = {
  corruptedSyncRecords: [],
  selectedSeason: new Date().getFullYear(),
};

export const getCorruptedSyncRecords = createStandardThunk<
  CorruptedSyncRecordContract,
  "getCorruptedSyncRecords"
>({
  typePrefix: "corruptedSyncRecord/getCorruptedSyncRecords",
  apiPath: "/realGreen/customer/sync/corruptedRecords/api",
  opName: "getCorruptedSyncRecords",
});

const corruptedSyncRecordSlice = createSlice({
  name: "corruptedSyncRecord",
  initialState,
  reducers: {
    setSelectedSeason(state, action: PayloadAction<number>) {
      state.selectedSeason = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getCorruptedSyncRecords.fulfilled, (state, action) => {
      state.corruptedSyncRecords = action.payload;
    });
  },
});

export const corruptedSyncRecordReducer = corruptedSyncRecordSlice.reducer;
export const corruptedSyncRecordActions = {
  ...corruptedSyncRecordSlice.actions,
  getCorruptedSyncRecords,
};
