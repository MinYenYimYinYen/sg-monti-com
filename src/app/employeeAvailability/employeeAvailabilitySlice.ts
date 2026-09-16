import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { EmployeeAvailabilityContract } from "@/app/employeeAvailability/api/EmployeeAvailabilityContract";
import { EmployeeAvailability } from "@/app/employeeAvailability/EmployeeAvailabilityTypes";

type EmployeeAvailabilityState = {
  docs: EmployeeAvailability[];
};

const initialState: EmployeeAvailabilityState = {
  docs: [],
};

const getAll = createStandardThunk<EmployeeAvailabilityContract, "getAll">({
  typePrefix: "employeeAvailability/getAll",
  apiPath: "/employeeAvailability/api",
  opName: "getAll",
});

const upsert = createStandardThunk<EmployeeAvailabilityContract, "upsert">({
  typePrefix: "employeeAvailability/upsert",
  apiPath: "/employeeAvailability/api",
  opName: "upsert",
});

const deleteOne = createStandardThunk<EmployeeAvailabilityContract, "deleteOne">({
  typePrefix: "employeeAvailability/deleteOne",
  apiPath: "/employeeAvailability/api",
  opName: "deleteOne",
});

const employeeAvailabilitySlice = createSlice({
  name: "employeeAvailability",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAll.fulfilled, (state, action) => {
      state.docs = action.payload;
    });

    builder.addCase(upsert.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.docs.findIndex(
        (d) => d.employeeId === updated.employeeId,
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
        (d) => d.employeeId !== deleted.employeeId,
      );
    });
  },
});

export const employeeAvailabilityActions = {
  getAll,
  upsert,
  deleteOne,
};

export const employeeAvailabilityReducer = employeeAvailabilitySlice.reducer;
