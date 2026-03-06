import { createSlice } from "@reduxjs/toolkit";
import { CallAheadContract } from "@/app/realGreen/callAhead/api/CallAheadContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CallAheadDoc } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { CallAheadKeyword } from "@/app/realGreen/callAhead/_lib/ext/CallAheadExtTypes";

interface CallAheadState {
  callAheadDocs: CallAheadDoc[];
  callAheadKeywords: CallAheadKeyword[];
}

const initialState: CallAheadState = {
  callAheadDocs: [],
  callAheadKeywords: [],
};

const callAheadSlice = createSlice({
  name: "callAhead",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getCallAheads.fulfilled, (state, action) => {
      state.callAheadDocs = action.payload;
    });
    builder.addCase(getKeywords.fulfilled, (state, action) => {
      state.callAheadKeywords = action.payload;
    });
    builder.addCase(upsertDocProps.fulfilled, (state, action) => {
      const docProps = action.meta.arg.params.docProps;
      const existingIndex = state.callAheadDocs.findIndex(
        (doc) => doc.callAheadId === docProps.callAheadId,
      );
      if (existingIndex >= 0) {
        state.callAheadDocs[existingIndex] = {
          ...state.callAheadDocs[existingIndex],
          ...docProps,
        };
      }
    });
    builder.addCase(upsertKeyword.fulfilled, (state, action) => {
      const upsertedKeyword = action.payload;
      const existingIndex = state.callAheadKeywords.findIndex(
        (kw) => kw.keywordId === upsertedKeyword.keywordId,
      );
      if (existingIndex >= 0) {
        state.callAheadKeywords[existingIndex] = upsertedKeyword;
      } else {
        state.callAheadKeywords.push(upsertedKeyword);
      }
    });
    builder.addCase(deleteKeyword.fulfilled, (state, action) => {
      const deletedKeyword = action.payload;
      state.callAheadKeywords = state.callAheadKeywords.filter(
        (kw) => kw.keywordId !== deletedKeyword.keywordId,
      );
    });
  },
});

const getCallAheads = createStandardThunk<CallAheadContract, "getAll">({
  typePrefix: "callAhead/getCallAheads",
  apiPath: "/realGreen/callAhead/api",
  opName: "getAll",
});

const upsertDocProps = createStandardThunk<CallAheadContract, "upsertDocProps">(
  {
    typePrefix: "callAhead/upsertDocProps",
    apiPath: "/realGreen/callAhead/api",
    opName: "upsertDocProps",
  },
);

const getKeywords = createStandardThunk<CallAheadContract, "getKeywords">({
  typePrefix: "callAhead/getKeywords",
  apiPath: "/realGreen/callAhead/api",
  opName: "getKeywords",
});

const upsertKeyword = createStandardThunk<CallAheadContract, "upsertKeyword">({
  typePrefix: "callAhead/upsertKeyword",
  apiPath: "/realGreen/callAhead/api",
  opName: "upsertKeyword",
});

const deleteKeyword = createStandardThunk<CallAheadContract, "deleteKeyword">({
  typePrefix: "callAhead/deleteKeyword",
  apiPath: "/realGreen/callAhead/api",
  opName: "deleteKeyword",
});

export const callAheadActions = {
  ...callAheadSlice.actions,
  getCallAheads,
  upsertDocProps,
  getKeywords,
  upsertKeyword,
  deleteKeyword,
};
export default callAheadSlice.reducer;
