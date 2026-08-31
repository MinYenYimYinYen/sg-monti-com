import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { FlagRuleContract } from "@/app/flagRule/FlagRuleContract";
import { FlagRule } from "@/app/flagRule/FlagRuleTypes";

type FlagRuleState = {
  flagRules: FlagRule[];
};

const initialState: FlagRuleState = {
  flagRules: [],
};

const getAll = createStandardThunk<FlagRuleContract, "getAll">({
  typePrefix: "flagRule/getAll",
  apiPath: "/flagRule/api",
  opName: "getAll",
});

const upsert = createStandardThunk<FlagRuleContract, "upsert">({
  typePrefix: "flagRule/upsert",
  apiPath: "/flagRule/api",
  opName: "upsert",
});

const deleteOne = createStandardThunk<FlagRuleContract, "deleteOne">({
  typePrefix: "flagRule/deleteOne",
  apiPath: "/flagRule/api",
  opName: "deleteOne",
});

const flagRuleSlice = createSlice({
  name: "flagRule",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAll.fulfilled, (state, action) => {
      state.flagRules = action.payload;
    });

    builder.addCase(upsert.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.flagRules.findIndex(
        (r) => r.flagRuleId === updated.flagRuleId,
      );
      if (idx !== -1) {
        state.flagRules[idx] = updated;
      } else {
        state.flagRules.push(updated);
      }
    });

    builder.addCase(deleteOne.fulfilled, (state, action) => {
      const deleted = action.payload;
      state.flagRules = state.flagRules.filter(
        (r) => r.flagRuleId !== deleted.flagRuleId,
      );
    });
  },
});

export const flagRuleActions = {
  getAll,
  upsert,
  deleteOne,
};

export const flagRuleReducer = flagRuleSlice.reducer;
