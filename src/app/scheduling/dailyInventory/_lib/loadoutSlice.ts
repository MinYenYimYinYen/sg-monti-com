import { LoadoutDoc } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { LoadoutContract } from "@/app/scheduling/dailyInventory/api/LoadoutContract";

type LoadoutState = {
  loadouts: LoadoutDoc[];
  finishLoadout: LoadoutDoc | null;
};

const initialState: LoadoutState = { loadouts: [], finishLoadout: null };

const upsertLoadout = createStandardThunk<LoadoutContract, "upsertLoadout">({
  typePrefix: "loadout/upsertLoadout",
  opName: "upsertLoadout",
  apiPath: "/scheduling/dailyInventory/api",
});

const getLoadout = createStandardThunk<LoadoutContract, "getLoadout">({
  typePrefix: "loadout/getLoadout",
  opName: "getLoadout",
  apiPath: "/scheduling/dailyInventory/api",
});

const getLoadouts = createStandardThunk<LoadoutContract, "getLoadouts">({
  typePrefix: "loadout/getLoadouts",
  opName: "getLoadouts",
  apiPath: "/scheduling/dailyInventory/api",
});

const loadoutSlice = createSlice({
  name: "loadout",
  initialState,
  reducers: {
    clearFinishLoadout: (state) => {
      state.finishLoadout = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getLoadout.fulfilled, (state, action) => {
      state.finishLoadout = action.payload;
    });

    builder.addCase(getLoadouts.fulfilled, (state, action) => {
      state.loadouts = action.payload;
    });

    builder.addCase(upsertLoadout.fulfilled, (state, action) => {
      const upserted = action.payload;

      // Update or insert in the loadouts list
      const existingIndex = state.loadouts.findIndex(
        (doc) => doc.employeeId === upserted.employeeId && doc.routeDate === upserted.routeDate,
      );
      if (existingIndex !== -1) {
        state.loadouts[existingIndex] = upserted;
      } else {
        state.loadouts.push(upserted);
      }

      // Keep finishLoadout in sync if it matches
      if (
        state.finishLoadout?.employeeId === upserted.employeeId &&
        state.finishLoadout?.routeDate === upserted.routeDate
      ) {
        state.finishLoadout = upserted;
      }
    });
  },
});

export const loadoutActions = {
  ...loadoutSlice.actions,
  upsertLoadout,
  getLoadout,
  getLoadouts,
};
export const loadoutReducer = loadoutSlice.reducer;
