import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

type EmployeePaceState = {
  /** Global date slider — sets the "view date" for all employee cards */
  mainDate: string;
  /** Per-employee overrides — set when a card's slider is moved independently */
  employeeDates: Record<string, string>;
  /** Tolerance for "on pace" classification: ±5% of avg capacity */
  paceTolerance: number;
};

const initialState: EmployeePaceState = {
  mainDate: dateStrings.today(),
  employeeDates: {},
  paceTolerance: 0.2,
};

const employeePaceSlice = createSlice({
  name: "employeePace",
  initialState,
  reducers: {
    /** Sets the global date and resets all per-employee overrides so cards snap back in sync */
    setMainDate: (state, action: PayloadAction<string>) => {
      state.mainDate = action.payload;
      state.employeeDates = {};
    },
    /** Moves a single employee card's slider independently of the global date */
    setEmployeeDate: (
      state,
      action: PayloadAction<{ employeeId: string; date: string }>,
    ) => {
      state.employeeDates[action.payload.employeeId] = action.payload.date;
    },
    setPaceTolerance: (state, action: PayloadAction<number>) => {
      state.paceTolerance = action.payload;
    },
  },
});

export const employeePaceActions = { ...employeePaceSlice.actions };
export const employeePaceReducer = employeePaceSlice.reducer;
