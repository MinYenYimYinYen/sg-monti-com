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
    builder.addCase(removeSeasonIncreases.fulfilled, (_state, _action) => {
      // Optimistic removal is handled by re-fetching; or handled in the UI via dispatch of getAll
    });
  },
});

export const seasonIncreasesActions = {
  ...seasonIncreasesSlice.actions,
  getAllSeasonIncreases,
  upsertSeasonIncreases,
  removeSeasonIncreases,
};

export default seasonIncreasesSlice.reducer;
