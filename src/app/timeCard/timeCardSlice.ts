import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { TimeCardContract } from "@/app/timeCard/api/timeCardContract";
import { Punch } from "@/app/timeCard/TimeCardTypes";

type TimeCardState = {
  docs: Punch[];
  lastImportedDate: string | null;
};

const initialState: TimeCardState = {
  docs: [],
  lastImportedDate: null,
};

const importPunches = createStandardThunk<TimeCardContract, "importPunches">({
  typePrefix: "timeCard/importPunches",
  apiPath: "/timeCard/api",
  opName: "importPunches",
});

const getPunches = createStandardThunk<TimeCardContract, "getPunches">({
  typePrefix: "timeCard/getPunches",
  apiPath: "/timeCard/api",
  opName: "getPunches",
});

const getLastImportedDate = createStandardThunk<TimeCardContract, "getLastImportedDate">({
  typePrefix: "timeCard/getLastImportedDate",
  apiPath: "/timeCard/api",
  opName: "getLastImportedDate",
});

const timeCardSlice = createSlice({
  name: "timeCard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getPunches.fulfilled, (state, action) => {
      state.docs = action.payload;
    });

    builder.addCase(getLastImportedDate.fulfilled, (state, action) => {
      state.lastImportedDate = action.payload;
    });

    // importPunches returns { imported, errors } — not Punch[].
    // The canonical punch store is populated via getPunches; no merge needed here.
    builder.addCase(importPunches.fulfilled, (_state, _action) => {
      // no-op: call getPunches after import to refresh docs
    });
  },
});

export const timeCardActions = {
  ...timeCardSlice.actions,
  importPunches,
  getPunches,
  getLastImportedDate,
};

export const timeCardReducer = timeCardSlice.reducer;
