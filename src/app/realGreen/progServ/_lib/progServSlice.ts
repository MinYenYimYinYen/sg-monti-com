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
      const { progCodeDocs, progServs } = action.payload;
      state.progCodeDocs = progCodeDocs;
      state.progServs = progServs;
    });
    builder.addCase(getServCodeDocs.fulfilled, (state, action) => {
      state.servCodeDocs = action.payload;
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

export const progServActions = {
  ...progServSlice.actions,
  getProgCodeDocs,
  getServCodeDocs,
};
export default progServSlice.reducer;
