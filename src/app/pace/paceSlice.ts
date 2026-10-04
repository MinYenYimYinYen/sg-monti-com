import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

type PaceState = {
  /** The "as of" date — the past/future split point for the engine. */
  mainDate: string;
  /** Persists the employee selection in the AssignmentEditorPanel across navigation. */
  assignmentEditorSelectedEmployeeIds: string[];
};

const initialState: PaceState = {
  mainDate: dateStrings.today(),
  assignmentEditorSelectedEmployeeIds: [],
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
  },
});

export const paceActions = { ...paceSlice.actions };
export const paceReducer = paceSlice.reducer;
