import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { GroupSequenceContract } from "@/app/pace/groupSequence/api/GroupSequenceContract";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";

type GroupSequenceState = {
  sequences: GroupSequence[];
};

const initialState: GroupSequenceState = {
  sequences: [],
};

const getSequences = createStandardThunk<GroupSequenceContract, "getSequences">({
  typePrefix: "pace/groupSequence/getSequences",
  apiPath: "/pace/groupSequence/api",
  opName: "getSequences",
});

const upsertSequence = createStandardThunk<GroupSequenceContract, "upsertSequence">({
  typePrefix: "pace/groupSequence/upsertSequence",
  apiPath: "/pace/groupSequence/api",
  opName: "upsertSequence",
});

const deleteSequence = createStandardThunk<GroupSequenceContract, "deleteSequence">({
  typePrefix: "pace/groupSequence/deleteSequence",
  apiPath: "/pace/groupSequence/api",
  opName: "deleteSequence",
});

const groupSequenceSlice = createSlice({
  name: "paceGroupSequence",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getSequences.fulfilled, (state, action) => {
      state.sequences = action.payload;
    });

    builder.addCase(upsertSequence.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.sequences.findIndex((s) => s.sequenceId === updated.sequenceId);
      if (idx !== -1) {
        state.sequences[idx] = updated;
      } else {
        state.sequences.push(updated);
      }
    });

    builder.addCase(deleteSequence.fulfilled, (state, action) => {
      const { sequenceId } = action.payload;
      state.sequences = state.sequences.filter((s) => s.sequenceId !== sequenceId);
    });
  },
});

export const paceGroupSequenceActions = {
  getSequences,
  upsertSequence,
  deleteSequence,
};

export const paceGroupSequenceReducer = groupSequenceSlice.reducer;
