import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { PlannedTimeOffContract } from "@/app/plannedTimeOff/api/PlannedTimeOffContract";
import { PlannedTimeOff } from "@/app/plannedTimeOff/plannedTimeOffTypes";

type PlannedTimeOffState = {
  docs: PlannedTimeOff[];
};

const initialState: PlannedTimeOffState = {
  docs: [],
};

const getAll = createStandardThunk<PlannedTimeOffContract, "getAll">({
  typePrefix: "plannedTimeOff/getAll",
  apiPath: "/plannedTimeOff/api",
  opName: "getAll",
});

const upsert = createStandardThunk<PlannedTimeOffContract, "upsert">({
  typePrefix: "plannedTimeOff/upsert",
  apiPath: "/plannedTimeOff/api",
  opName: "upsert",
});

const deleteOne = createStandardThunk<PlannedTimeOffContract, "deleteOne">({
  typePrefix: "plannedTimeOff/deleteOne",
  apiPath: "/plannedTimeOff/api",
  opName: "deleteOne",
});

const plannedTimeOffSlice = createSlice({
  name: "plannedTimeOff",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAll.fulfilled, (state, action) => {
      state.docs = action.payload;
    });

    builder.addCase(upsert.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.docs.findIndex(
        (d) => d.plannedTimeOffId === updated.plannedTimeOffId,
      );
      if (idx !== -1) {
        state.docs[idx] = updated;
      } else {
        state.docs.push(updated);
      }
    });

    builder.addCase(deleteOne.fulfilled, (state, action) => {
      const deleted = action.payload;
      state.docs = state.docs.filter(
        (d) => d.plannedTimeOffId !== deleted.plannedTimeOffId,
      );
    });
  },
});

export const plannedTimeOffActions = {
  getAll,
  upsert,
  deleteOne,
};

export const plannedTimeOffReducer = plannedTimeOffSlice.reducer;
