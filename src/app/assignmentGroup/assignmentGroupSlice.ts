import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { AssignmentGroupContract } from "@/app/assignmentGroup/api/AssignmentGroupContract";
import { AssignmentGroup } from "@/app/assignmentGroup/AssignmentGroupTypes";

type AssignmentGroupState = {
  groups: AssignmentGroup[];
};

const initialState: AssignmentGroupState = {
  groups: [],
};

const getGroups = createStandardThunk<AssignmentGroupContract, "getGroups">({
  typePrefix: "assignmentGroup/getGroups",
  apiPath: "/assignmentGroup/api",
  opName: "getGroups",
});

const upsertGroup = createStandardThunk<AssignmentGroupContract, "upsertGroup">({
  typePrefix: "assignmentGroup/upsertGroup",
  apiPath: "/assignmentGroup/api",
  opName: "upsertGroup",
});

const deleteGroup = createStandardThunk<AssignmentGroupContract, "deleteGroup">({
  typePrefix: "assignmentGroup/deleteGroup",
  apiPath: "/assignmentGroup/api",
  opName: "deleteGroup",
});

const assignmentGroupSlice = createSlice({
  name: "assignmentGroup",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getGroups.fulfilled, (state, action) => {
      state.groups = action.payload;
    });

    builder.addCase(upsertGroup.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.groups.findIndex((g) => g.groupId === updated.groupId);
      if (idx !== -1) {
        state.groups[idx] = updated;
      } else {
        state.groups.push(updated);
      }
    });

    builder.addCase(deleteGroup.fulfilled, (state, action) => {
      const { groupId } = action.payload;
      state.groups = state.groups.filter((g) => g.groupId !== groupId);
    });
  },
});

export const assignmentGroupActions = {
  getGroups,
  upsertGroup,
  deleteGroup,
};

export const assignmentGroupReducer = assignmentGroupSlice.reducer;
