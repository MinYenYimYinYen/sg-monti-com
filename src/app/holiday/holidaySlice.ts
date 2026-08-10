import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { HolidayContract } from "@/app/holiday/api/HolidayContract";
import { Holiday } from "@/app/holiday/holidayTypes";

type HolidayState = {
  docs: Holiday[];
};

const initialState: HolidayState = {
  docs: [],
};

const getAll = createStandardThunk<HolidayContract, "getAll">({
  typePrefix: "holiday/getAll",
  apiPath: "/holiday/api",
  opName: "getAll",
});

const upsert = createStandardThunk<HolidayContract, "upsert">({
  typePrefix: "holiday/upsert",
  apiPath: "/holiday/api",
  opName: "upsert",
});

const deleteOne = createStandardThunk<HolidayContract, "deleteOne">({
  typePrefix: "holiday/deleteOne",
  apiPath: "/holiday/api",
  opName: "deleteOne",
});

const holidaySlice = createSlice({
  name: "holiday",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAll.fulfilled, (state, action) => {
      state.docs = action.payload;
    });

    builder.addCase(upsert.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.docs.findIndex(
        (d) => d.holidayId === updated.holidayId,
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
        (d) => d.holidayId !== deleted.holidayId,
      );
    });
  },
});

export const holidayActions = {
  getAll,
  upsert,
  deleteOne,
};

export const holidayReducer = holidaySlice.reducer;
