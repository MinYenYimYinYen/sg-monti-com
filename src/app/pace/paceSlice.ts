import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

type PaceState = {
  /** The "as of" date — the past/future split point for the engine. */
  mainDate: string;
  /** Persists the employee selection in the SetupEmployeesPage across navigation. */
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
  /**
   * Visual "queued" toggle — tracks which employees the manager has mentally queued up
   * in the CRM for a given date. Toggled by clicking the employee name in RoutePlanEmployeeRow.
   * Shape: { [date]: { [employeeId]: boolean } }
   * Pure UI state — not persisted, not synced to any backend.
   */
  queuedByDateAndEmployee: Record<string, Record<string, boolean>>;
  /**
   * Price the manager has queued up in the CRM for a given employee on a given date.
   * A positive value means the manager has entered an amount to be printed for that employee.
   * Shape: { [date]: { [employeeId]: number } }
   * Pure UI state — not persisted, not synced to any backend.
   */
  queuedPriceByDateAndEmployee: Record<string, Record<string, number>>;
  /**
   * The currently selected groupId in the SetupGroupsPage nav panel.
   * Persisted in Redux so selection survives navigation within the pace module.
   */
  setupSelectedGroupId: string | null;
  /**
   * Selected groupIds per employee in the SetupEmployeesPage assignment cards.
   * Shape: { [employeeId]: string[] } — only employees with selections are present.
   * Persisted so selections survive navigation within the pace module.
   */
  setupSelectedGroupsByEmployee: Record<string, string[]>;
};

const initialState: PaceState = {
  mainDate: dateStrings.today(),
  assignmentEditorSelectedEmployeeIds: [],
  goalMultiplier: 1,
  goalMultiplierGroupIds: [],
  queuedByDateAndEmployee: {},
  queuedPriceByDateAndEmployee: {},
  setupSelectedGroupId: null,
  setupSelectedGroupsByEmployee: {},
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
    toggleQueued: (state, action: PayloadAction<{ date: string; employeeId: string }>) => {
      const { date, employeeId } = action.payload;
      // No-op when a positive queued price is set — the row is already considered queued.
      if ((state.queuedPriceByDateAndEmployee[date]?.[employeeId] ?? 0) > 0) return;
      if (!state.queuedByDateAndEmployee[date]) {
        state.queuedByDateAndEmployee[date] = {};
      }
      const current = state.queuedByDateAndEmployee[date][employeeId] ?? false;
      state.queuedByDateAndEmployee[date][employeeId] = !current;
    },
    setQueuedPrice: (state, action: PayloadAction<{ date: string; employeeId: string; price: number }>) => {
      const { date, employeeId, price } = action.payload;
      const safePrice = Math.max(0, price);
      if (!state.queuedPriceByDateAndEmployee[date]) {
        state.queuedPriceByDateAndEmployee[date] = {};
      }
      if (safePrice === 0) {
        delete state.queuedPriceByDateAndEmployee[date][employeeId];
      } else {
        state.queuedPriceByDateAndEmployee[date][employeeId] = safePrice;
      }
    },
    setSetupSelectedGroupId: (state, action: PayloadAction<string | null>) => {
      state.setupSelectedGroupId = action.payload;
    },
    toggleSetupGroupSelection: (
      state,
      action: PayloadAction<{ employeeId: string; groupId: string }>,
    ) => {
      const { employeeId, groupId } = action.payload;
      const current = state.setupSelectedGroupsByEmployee[employeeId] ?? [];
      if (current.includes(groupId)) {
        const next = current.filter((id) => id !== groupId);
        if (next.length === 0) {
          delete state.setupSelectedGroupsByEmployee[employeeId];
        } else {
          state.setupSelectedGroupsByEmployee[employeeId] = next;
        }
      } else {
        state.setupSelectedGroupsByEmployee[employeeId] = [...current, groupId];
      }
    },
    clearSetupGroupSelectionForEmployee: (state, action: PayloadAction<string>) => {
      delete state.setupSelectedGroupsByEmployee[action.payload];
    },
  },
});

export const paceActions = { ...paceSlice.actions };
export const paceReducer = paceSlice.reducer;
