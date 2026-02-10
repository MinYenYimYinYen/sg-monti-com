import { createSlice } from "@reduxjs/toolkit";
import { ProgServContract } from "@/app/realGreen/progServ/api/ProgServContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import {
  handleRevertServCode,
  handleSetServCodeProductSelection,
  handleUpdateServCode,
} from "@/app/realGreen/progServ/_lib/slice/progServActions";
import { ProgServState } from "@/app/realGreen/progServ/_lib/types/ProgServState";

const initialState: ProgServState = {
  progCodeDocs: [],
  servCodeDocs: [],
  progServs: [],
  unsavedServCodeChanges: [],
};

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

export const saveServCodeChanges = createStandardThunk<
  ProgServContract,
  "saveServCodeChanges"
>({
  typePrefix: "progServ/saveServCodeChanges",
  apiPath: "/realGreen/progServ/api",
  opName: "saveServCodeChanges",
});

const progServSlice = createSlice({
  name: "progServ",
  initialState,
  reducers: {
    updateServCode: handleUpdateServCode,
    revertServCode: handleRevertServCode,
    setServCodeProductSelection: handleSetServCodeProductSelection,
  },
  extraReducers: (builder) => {
    builder.addCase(getProgCodeDocs.fulfilled, (state, action) => {
      const { progCodeDocs, progServs } = action.payload;
      state.progCodeDocs = progCodeDocs;
      state.progServs = progServs;
    });
    builder.addCase(getServCodeDocs.fulfilled, (state, action) => {
      state.servCodeDocs = action.payload;
    });
    builder.addCase(saveServCodeChanges.fulfilled, (state) => {
      state.unsavedServCodeChanges = [];
    });
  },
});

export const progServActions = {
  ...progServSlice.actions,
  getProgCodeDocs,
  getServCodeDocs,
  saveServCodeChanges,
};
export default progServSlice.reducer;
