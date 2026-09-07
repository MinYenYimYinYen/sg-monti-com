import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { SeasonIncreasesContract } from "@/app/priceIncrease/seasonIncreases/api/SeasonIncreasesContract";
import { SeasonIncreasesDoc } from "@/app/priceIncrease/seasonIncreases/SeasonIncreasesTypes";

type SeasonIncreasesState = {
  docs: SeasonIncreasesDoc[];
};

const initialState: SeasonIncreasesState = {
  docs: [],
};

export const getAllSeasonIncreases = createStandardThunk<SeasonIncreasesContract, "getAll">({
  typePrefix: "seasonIncreases/getAll",
  apiPath: "/priceIncrease/seasonIncreases/api",
  opName: "getAll",
});

export const upsertSeasonIncreases = createStandardThunk<SeasonIncreasesContract, "upsert">({
  typePrefix: "seasonIncreases/upsert",
  apiPath: "/priceIncrease/seasonIncreases/api",
  opName: "upsert",
});

export const setActiveSeasonIncreases = createStandardThunk<SeasonIncreasesContract, "setActive">({
  typePrefix: "seasonIncreases/setActive",
  apiPath: "/priceIncrease/seasonIncreases/api",
  opName: "setActive",
});

export const removeSeasonIncreases = createStandardThunk<SeasonIncreasesContract, "remove">({
  typePrefix: "seasonIncreases/remove",
  apiPath: "/priceIncrease/seasonIncreases/api",
  opName: "remove",
});

const seasonIncreasesSlice = createSlice({
  name: "seasonIncreases",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAllSeasonIncreases.fulfilled, (state, action) => {
      state.docs = action.payload;
    });
    builder.addCase(upsertSeasonIncreases.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.docs.findIndex((d) => d.seasonIncreasesId === updated.seasonIncreasesId);
      if (idx >= 0) {
        state.docs[idx] = updated;
      } else {
        state.docs.push(updated);
      }
    });
    builder.addCase(setActiveSeasonIncreases.fulfilled, (state, action) => {
      const id = (action.meta.arg as { params: { seasonIncreasesId: string } }).params.seasonIncreasesId;
      state.docs = state.docs.map((d) => ({ ...d, isActive: d.seasonIncreasesId === id }));
    });
    builder.addCase(removeSeasonIncreases.fulfilled, (state, action) => {
      const id = (action.meta.arg as { params: { seasonIncreasesId: string } }).params.seasonIncreasesId;
      state.docs = state.docs.filter((d) => d.seasonIncreasesId !== id);
    });
  },
});

export const seasonIncreasesActions = {
  ...seasonIncreasesSlice.actions,
  getAllSeasonIncreases,
  upsertSeasonIncreases,
  setActiveSeasonIncreases,
  removeSeasonIncreases,
};

export default seasonIncreasesSlice.reducer;
