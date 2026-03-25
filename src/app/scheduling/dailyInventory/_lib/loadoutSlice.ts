import { LoadoutDoc } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { LoadoutContract } from "@/app/scheduling/dailyInventory/api/LoadoutContract";

type LoadoutState = {
  loadouts: LoadoutDoc[];
  myLoadout: LoadoutDoc | null;
};

const initialState: LoadoutState = { loadouts: [], myLoadout: null };

const loadoutSlice = createSlice({
  name: "loadout",
  initialState,
  reducers: {},
  extraReducers: (builder) => {},
});

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

export const loadoutActions = {
  ...loadoutSlice.actions,
  upsertLoadout,
  getLoadout,
  getLoadouts,
};
export const loadoutReducer = loadoutSlice.reducer;
