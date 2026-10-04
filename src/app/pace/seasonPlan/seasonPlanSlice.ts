import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { SeasonPlanContract } from "@/app/pace/seasonPlan/api/SeasonPlanContract";
import { SeasonPlan } from "@/app/pace/seasonPlan/SeasonPlanTypes";

type SeasonPlanState = {
  seasonPlans: SeasonPlan[];
};

const initialState: SeasonPlanState = {
  seasonPlans: [],
};

const getSeasonPlans = createStandardThunk<SeasonPlanContract, "getSeasonPlans">({
  typePrefix: "pace/seasonPlan/getSeasonPlans",
  apiPath: "/pace/seasonPlan/api",
  opName: "getSeasonPlans",
});

const upsertSeasonPlan = createStandardThunk<SeasonPlanContract, "upsertSeasonPlan">({
  typePrefix: "pace/seasonPlan/upsertSeasonPlan",
  apiPath: "/pace/seasonPlan/api",
  opName: "upsertSeasonPlan",
});

const deleteSeasonPlan = createStandardThunk<SeasonPlanContract, "deleteSeasonPlan">({
  typePrefix: "pace/seasonPlan/deleteSeasonPlan",
  apiPath: "/pace/seasonPlan/api",
  opName: "deleteSeasonPlan",
});

const activateSeasonPlan = createStandardThunk<SeasonPlanContract, "activateSeasonPlan">({
  typePrefix: "pace/seasonPlan/activateSeasonPlan",
  apiPath: "/pace/seasonPlan/api",
  opName: "activateSeasonPlan",
});

const seasonPlanSlice = createSlice({
  name: "paceSeasonPlan",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getSeasonPlans.fulfilled, (state, action) => {
      state.seasonPlans = action.payload;
    });

    builder.addCase(upsertSeasonPlan.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.seasonPlans.findIndex((p) => p.name === updated.name);
      if (idx !== -1) {
        state.seasonPlans[idx] = updated;
      } else {
        state.seasonPlans.push(updated);
      }
    });

    builder.addCase(deleteSeasonPlan.fulfilled, (state, action) => {
      const { name } = action.payload;
      state.seasonPlans = state.seasonPlans.filter((p) => p.name !== name);
    });

    builder.addCase(activateSeasonPlan.fulfilled, (state, action) => {
      state.seasonPlans = action.payload;
    });
  },
});

export const paceSeasonPlanActions = {
  ...seasonPlanSlice.actions,
  getSeasonPlans,
  upsertSeasonPlan,
  deleteSeasonPlan,
  activateSeasonPlan,
};

export const paceSeasonPlanReducer = seasonPlanSlice.reducer;
