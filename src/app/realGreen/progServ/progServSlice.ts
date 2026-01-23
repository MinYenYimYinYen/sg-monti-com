import { createSlice } from "@reduxjs/toolkit";
import { ServCodeWithMongo } from "@/app/realGreen/progServ/_lib/types/ServCode";
import { ProgServ } from "@/app/realGreen/progServ/_lib/types/ProgServ";
import { ProgServContract } from "@/app/realGreen/progServ/_lib/types/ProgServContract";
import { ProgCodeWithMongo } from "@/app/realGreen/progServ/_lib/types/ProgCode";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

// --- Thunks ---

export const fetchDryProgCodes = createStandardThunk<
  ProgServContract,
  "getProgCodes"
>({
  typePrefix: "progServ/fetchDryProgCodes",
  apiPath: "/realGreen/progServ/api",
  opName: "getProgCodes",
});

export const fetchDryServCodes = createStandardThunk<
  ProgServContract,
  "getServCodes"
>({
  typePrefix: "progServ/fetchDryServCodes",
  apiPath: "/realGreen/progServ/api",
  opName: "getServCodes",
});

export const fetchProgServs = createStandardThunk<
  ProgServContract,
  "syncProgServ"
>({
  typePrefix: "progServ/fetchProgServs",
  apiPath: "/realGreen/progServ/api",
  opName: "syncProgServ",
});

// --- Slice ---

interface ProgServState {
  dryProgCodes: ProgCodeWithMongo[];
  dryServCodes: ServCodeWithMongo[];
  progServLinks: ProgServ[];
}

const initialState: ProgServState = {
  dryProgCodes: [],
  dryServCodes: [],
  progServLinks: [],
};

const progServSlice = createSlice({
  name: "progServ",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchDryProgCodes.fulfilled, (state, action) => {
      state.dryProgCodes = action.payload;
    });
    builder.addCase(fetchDryServCodes.fulfilled, (state, action) => {
      state.dryServCodes = action.payload;
    });
    builder.addCase(fetchProgServs.fulfilled, (state, action) => {
      state.progServLinks = action.payload;
    });
  },
});

export const progServActions = {
  ...progServSlice.actions,
  fetchDryProgCodes,
  fetchDryServCodes,
  fetchProgServs,
};
export default progServSlice.reducer;
