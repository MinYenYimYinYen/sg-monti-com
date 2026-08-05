import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

type PaceCrawlerState = {
  /** Global date slider — sets the "view date" for the pace crawler */
  mainDate: string;
  /** Persists the employee selection in the AssignmentEditorPanel across navigation */
  assignmentEditorSelectedEmployeeIds: string[];
};

const initialState: PaceCrawlerState = {
  mainDate: dateStrings.today(),
  assignmentEditorSelectedEmployeeIds: [],
};

const paceCrawlerSlice = createSlice({
  name: "paceCrawler",
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

export const paceCrawlerActions = { ...paceCrawlerSlice.actions };
export const paceCrawlerReducer = paceCrawlerSlice.reducer;
