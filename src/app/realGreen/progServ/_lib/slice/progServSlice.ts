import { createSlice } from "@reduxjs/toolkit";
import { ProgServContract } from "@/app/realGreen/progServ/api/ProgServContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { progServActionHandlers } from "@/app/realGreen/progServ/_lib/slice/progServActions";
import { ProgServState } from "@/app/realGreen/progServ/_lib/types/ProgServState";

const initialState: ProgServState = {
  progCodeDocs: [],
  servCodeDocs: [],
  progServs: [],
  unsavedServCodeChanges: [],
  unsavedProgCodeChanges: [],
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

export const saveProgCodeChanges = createStandardThunk<
  ProgServContract,
  "saveProgCodeChanges"
>({
  typePrefix: "progServ/saveProgCodeChanges",
  apiPath: "/realGreen/progServ/api",
  opName: "saveProgCodeChanges",
});

const progServSlice = createSlice({
  name: "progServ",
  initialState,
  reducers: {
    updateServCode: progServActionHandlers.updateServCode,
    revertServCode: progServActionHandlers.revertServCode,
    addProductRule: progServActionHandlers.addProductRule,
    removeProductRule: progServActionHandlers.removeProductRule,
    updateProductRuleSize: progServActionHandlers.updateProductRuleSize,
    updateProductRuleOperator: progServActionHandlers.updateProductRuleOperator,
    addProductRuleProductMaster:
      progServActionHandlers.addProductRuleProductMaster,
    removeProductRuleProductMaster:
      progServActionHandlers.removeProductRuleProductMaster,
    updateProgCode: progServActionHandlers.updateProgCode,
    revertProgCode: progServActionHandlers.revertProgCode,
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
    builder.addCase(saveProgCodeChanges.fulfilled, (state) => {
      state.unsavedProgCodeChanges = [];
    });
  },
});

export const progServActions = {
  ...progServSlice.actions,
  getProgCodeDocs,
  getServCodeDocs,
  saveServCodeChanges,
  saveProgCodeChanges,
};
export default progServSlice.reducer;
