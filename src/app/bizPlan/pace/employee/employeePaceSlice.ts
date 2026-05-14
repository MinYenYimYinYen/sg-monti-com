import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

type EmployeePaceState = {
  /** Global date slider — sets the "view date" for all employee cards */
  mainDate: string;
  /** Per-employee overrides — set when a card's slider is moved independently */
  employeeDates: Record<string, string>;
  /**
   * Tolerance for "on pace" classification.
   * Expressed as a fraction of the required daily rate: ±20% means the employee
   * can be 20% above or below the required rate and still be considered on track.
   * e.g. 0.20 = ±20% of required rate.
   */
  paceTolerance: number;
  /** When true, upcoming (notStarted) servCodes are merged into each employee card's
   * main list in priority order so reorder arrows work correctly across all servCodes. */
  showUpcoming: boolean;
  /**
   * Controls whether target CSP is based on the employee's average daily rate or
   * their maximum (aggressive routing) daily rate.
   * 'avg' = expected pace, 'max' = best-case aggressive pace.
   */
  rateMode: "avg" | "max";
};

const initialState: EmployeePaceState = {
  mainDate: dateStrings.today(),
  employeeDates: {},
  paceTolerance: 0.5,
  showUpcoming: false,
  rateMode: "avg",
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
    toggleShowUpcoming: (state) => {
      state.showUpcoming = !state.showUpcoming;
    },
    setRateMode: (state, action: PayloadAction<"avg" | "max">) => {
      state.rateMode = action.payload;
    },
  },
});

export const employeePaceActions = { ...employeePaceSlice.actions };
export const employeePaceReducer = employeePaceSlice.reducer;
