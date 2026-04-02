import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { TemplateContract } from "@/app/quickSend/templates/api/TemplateContract";
import { TreeNodeDoc } from "@/app/quickSend/templates/TemplateTypes";

type TemplateState = {
  treeNodeDocs: TreeNodeDoc[];
};

const initialState: TemplateState = {
  treeNodeDocs: [],
};

export const getTreeNodes = createStandardThunk<TemplateContract, "getTreeNodes">({
  typePrefix: "template/getTreeNodes",
  apiPath: "/quickSend/templates/api",
  opName: "getTreeNodes",
});

const templateSlice = createSlice({
  name: "template",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getTreeNodes.fulfilled, (state, action) => {
      state.treeNodeDocs = action.payload;
    });
  },
});

export const templateReducer = templateSlice.reducer;
