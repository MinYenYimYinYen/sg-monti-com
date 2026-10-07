import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { AssignmentGroupContract } from "@/app/pace/assignmentGroup/api/AssignmentGroupContract";
import { AssignmentGroupDoc } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";

type AssignmentGroupState = {
  assignmentGroupDocs: AssignmentGroupDoc[];
};

const initialState: AssignmentGroupState = {
  assignmentGroupDocs: [],
};

const getGroups = createStandardThunk<AssignmentGroupContract, "getGroups">({
  typePrefix: "pace/assignmentGroup/getGroups",
  apiPath: "/pace/assignmentGroup/api",
  opName: "getGroups",
});

const upsertGroup = createStandardThunk<AssignmentGroupContract, "upsertGroup">({
  typePrefix: "pace/assignmentGroup/upsertGroup",
  apiPath: "/pace/assignmentGroup/api",
  opName: "upsertGroup",
});

const deleteGroup = createStandardThunk<AssignmentGroupContract, "deleteGroup">({
  typePrefix: "pace/assignmentGroup/deleteGroup",
  apiPath: "/pace/assignmentGroup/api",
  opName: "deleteGroup",
});

const assignmentGroupSlice = createSlice({
  name: "paceAssignmentGroup",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getGroups.fulfilled, (state, action) => {
      state.assignmentGroupDocs = action.payload;
    });

    builder.addCase(upsertGroup.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.assignmentGroupDocs.findIndex((g) => g.groupId === updated.groupId);
      if (idx !== -1) {
        state.assignmentGroupDocs[idx] = updated;
      } else {
        state.assignmentGroupDocs.push(updated);
      }
    });

    builder.addCase(deleteGroup.fulfilled, (state, action) => {
      const { groupId } = action.payload;
      state.assignmentGroupDocs = state.assignmentGroupDocs.filter((g) => g.groupId !== groupId);
    });
  },
});

export const paceAssignmentGroupActions = {
  getGroups,
  upsertGroup,
  deleteGroup,
};

export const paceAssignmentGroupReducer = assignmentGroupSlice.reducer;
