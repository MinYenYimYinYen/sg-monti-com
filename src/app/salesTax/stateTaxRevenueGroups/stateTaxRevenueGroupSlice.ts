import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { StateTaxRevenueGroupContract } from "@/app/salesTax/stateTaxRevenueGroups/api/StateTaxRevenueGroupContract";
import { StateTaxRevenueGroupDoc } from "@/app/salesTax/stateTaxRevenueGroups/StateTaxRevenueGroupTypes";

type StateTaxRevenueGroupState = {
  docs: StateTaxRevenueGroupDoc[];
};

const initialState: StateTaxRevenueGroupState = {
  docs: [],
};

const API_PATH = "/salesTax/stateTaxRevenueGroups/api";

export const getAllStateTaxRevenueGroups = createStandardThunk<
  StateTaxRevenueGroupContract,
  "getAll"
>({
  typePrefix: "stateTaxRevenueGroup/getAll",
  apiPath: API_PATH,
  opName: "getAll",
});

export const createStateTaxRevenueGroup = createStandardThunk<
  StateTaxRevenueGroupContract,
  "createGroup"
>({
  typePrefix: "stateTaxRevenueGroup/createGroup",
  apiPath: API_PATH,
  opName: "createGroup",
});

export const joinStateTaxRevenueGroup = createStandardThunk<
  StateTaxRevenueGroupContract,
  "joinGroup"
>({
  typePrefix: "stateTaxRevenueGroup/joinGroup",
  apiPath: API_PATH,
  opName: "joinGroup",
});

export const leaveStateTaxRevenueGroup = createStandardThunk<
  StateTaxRevenueGroupContract,
  "leaveGroup"
>({
  typePrefix: "stateTaxRevenueGroup/leaveGroup",
  apiPath: API_PATH,
  opName: "leaveGroup",
});

function upsertDoc({
  docs,
  updated,
}: {
  docs: StateTaxRevenueGroupDoc[];
  updated: StateTaxRevenueGroupDoc;
}) {
  const existingIndex = docs.findIndex((doc) => doc.mnTaxCode === updated.mnTaxCode);
  if (existingIndex >= 0) {
    docs[existingIndex] = updated;
  } else {
    docs.push(updated);
  }
}

const stateTaxRevenueGroupSlice = createSlice({
  name: "stateTaxRevenueGroup",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAllStateTaxRevenueGroups.fulfilled, (state, action) => {
      state.docs = action.payload;
    });
    builder.addCase(createStateTaxRevenueGroup.fulfilled, (state, action) => {
      upsertDoc({ docs: state.docs, updated: action.payload });
    });
    builder.addCase(joinStateTaxRevenueGroup.fulfilled, (state, action) => {
      upsertDoc({ docs: state.docs, updated: action.payload });
    });
    builder.addCase(leaveStateTaxRevenueGroup.fulfilled, (state, action) => {
      const { mnTaxCode } = action.meta.arg.params;
      state.docs = state.docs.filter((doc) => doc.mnTaxCode !== mnTaxCode);
    });
  },
});

export const stateTaxRevenueGroupActions = {
  getAllStateTaxRevenueGroups,
  createStateTaxRevenueGroup,
  joinStateTaxRevenueGroup,
  leaveStateTaxRevenueGroup,
};

export const stateTaxRevenueGroupReducer = stateTaxRevenueGroupSlice.reducer;
