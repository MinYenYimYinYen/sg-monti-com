import { createSlice } from "@reduxjs/toolkit";
import { ServCodeDoc } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ProgServ } from "@/app/realGreen/progServ/_lib/types/ProgServ";
import { ProgServContract } from "@/app/realGreen/progServ/api/ProgServContract";
import { ProgCodeDoc } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

interface ProgServState {
  progCodeDocs: ProgCodeDoc[];
  servCodeDocs: ServCodeDoc[];
  progServs: ProgServ[];
}

const initialState: ProgServState = {
  progCodeDocs: [],
  servCodeDocs: [],
  progServs: [],
};

const progServSlice = createSlice({
  name: "progServ",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getProgCodeDocs.fulfilled, (state, action) => {
      state.progCodeDocs = action.payload;
    });
    builder.addCase(getServCodeDocs.fulfilled, (state, action) => {
      state.servCodeDocs = action.payload;
    });
    builder.addCase(getProgServs.fulfilled, (state, action) => {
      state.progServs = action.payload;
    });
  },
});

export const getProgCodeDocs = createStandardThunk<
  ProgServContract,
  "getProgCodes"
>({
  typePrefix: "progServ/getProgCodeDocs",
  apiPath: "/realGreen/progServ/api",
  opName: "getProgCodes",
});

export const getServCodeDocs = createStandardThunk<
  ProgServContract,
  "getServCodes"
>({
  typePrefix: "progServ/getServCodeDocs",
  apiPath: "/realGreen/progServ/api",
  opName: "getServCodes",
});

export const getProgServs = createStandardThunk<
  ProgServContract,
  "syncProgServ"
>({
  typePrefix: "progServ/getProgServs",
  apiPath: "/realGreen/progServ/api",
  opName: "syncProgServ",
});

export const progServActions = {
  ...progServSlice.actions,
   getProgCodeDocs,
   getServCodeDocs,
   getProgServs,
};
export default progServSlice.reducer;
