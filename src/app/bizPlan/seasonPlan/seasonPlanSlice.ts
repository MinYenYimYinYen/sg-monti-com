import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { SeasonPlanContract } from "@/app/bizPlan/seasonPlan/api/SeasonPlanContract";
import { SeasonPlan } from "@/app/bizPlan/seasonPlan/SeasonPlanTypes";

type SeasonPlanState = {
  seasonPlans: SeasonPlan[];
};

const initialState: SeasonPlanState = {
  seasonPlans: [],
};

const getSeasonPlans = createStandardThunk<SeasonPlanContract, "getSeasonPlans">({
  typePrefix: "seasonPlan/getSeasonPlans",
  apiPath: "/bizPlan/seasonPlan/api",
  opName: "getSeasonPlans",
});

const upsertSeasonPlan = createStandardThunk<SeasonPlanContract, "upsertSeasonPlan">({
  typePrefix: "seasonPlan/upsertSeasonPlan",
  apiPath: "/bizPlan/seasonPlan/api",
  opName: "upsertSeasonPlan",
});

const deleteSeasonPlan = createStandardThunk<SeasonPlanContract, "deleteSeasonPlan">({
  typePrefix: "seasonPlan/deleteSeasonPlan",
  apiPath: "/bizPlan/seasonPlan/api",
  opName: "deleteSeasonPlan",
});

const activateSeasonPlan = createStandardThunk<SeasonPlanContract, "activateSeasonPlan">({
  typePrefix: "seasonPlan/activateSeasonPlan",
  apiPath: "/bizPlan/seasonPlan/api",
  opName: "activateSeasonPlan",
});

const seasonPlanSlice = createSlice({
  name: "seasonPlan",
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

export const seasonPlanActions = {
  ...seasonPlanSlice.actions,
  getSeasonPlans,
  upsertSeasonPlan,
  deleteSeasonPlan,
  activateSeasonPlan,
};

export const seasonPlanReducer = seasonPlanSlice.reducer;
