import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

type PaceState = {
  /** The "as of" date — the past/future split point for the engine. */
  mainDate: string;
  /** Persists the employee selection in the AssignmentEditorPanel across navigation. */
  assignmentEditorSelectedEmployeeIds: string[];
  /**
   * What-if multiplier applied to every employee's dailyRevenueGoal before the engine runs.
   * 1.0 = baseline goals, 1.2 = 20% more aggressive, 0.8 = 20% less aggressive.
   * Only affects the future crawl phase — past production is real data.
   */
  goalMultiplier: number;
  /**
   * The assignment groups selected in the GoalMultiplierSlider multi-select popover.
   * Persisted here so the selection survives navigation within the pace module.
   * Empty array = no groups selected (slider is disabled).
   */
  goalMultiplierGroupIds: string[];
};

const initialState: PaceState = {
  mainDate: dateStrings.today(),
  assignmentEditorSelectedEmployeeIds: [],
  goalMultiplier: 1,
  goalMultiplierGroupIds: [],
};

const paceSlice = createSlice({
  name: "pace",
  initialState,
  reducers: {
    setMainDate: (state, action: PayloadAction<string>) => {
      state.mainDate = action.payload;
    },
    setAssignmentEditorSelectedEmployeeIds: (state, action: PayloadAction<string[]>) => {
      state.assignmentEditorSelectedEmployeeIds = action.payload;
    },
    setGoalMultiplier: (state, action: PayloadAction<number>) => {
      state.goalMultiplier = action.payload;
    },
    setGoalMultiplierGroupIds: (state, action: PayloadAction<string[]>) => {
      state.goalMultiplierGroupIds = action.payload;
    },
  },
});

export const paceActions = { ...paceSlice.actions };
export const paceReducer = paceSlice.reducer;
