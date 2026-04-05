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

export const createNode = createStandardThunk<TemplateContract, "createNode">({
  typePrefix: "template/createNode",
  apiPath: "/quickSend/templates/api",
  opName: "createNode",
});

export const updateNode = createStandardThunk<TemplateContract, "updateNode">({
  typePrefix: "template/updateNode",
  apiPath: "/quickSend/templates/api",
  opName: "updateNode",
});

export const deleteNode = createStandardThunk<TemplateContract, "deleteNode">({
  typePrefix: "template/deleteNode",
  apiPath: "/quickSend/templates/api",
  opName: "deleteNode",
});

const templateSlice = createSlice({
  name: "template",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getTreeNodes.fulfilled, (state, action) => {
      state.treeNodeDocs = action.payload;
    });

    builder.addCase(createNode.fulfilled, (state, action) => {
      state.treeNodeDocs.push(action.payload);
    });

    builder.addCase(updateNode.fulfilled, (state, action) => {
      const updated = action.payload;
      const index = state.treeNodeDocs.findIndex((n) => n.nodeId === updated.nodeId);
      if (index >= 0) {
        state.treeNodeDocs[index] = updated;
      }
    });

    builder.addMatcher(deleteNode.fulfilled.match, (state, action) => {
      const nodeId = (action as ReturnType<typeof deleteNode.fulfilled>).meta.arg.params.nodeId;
      state.treeNodeDocs = state.treeNodeDocs.filter((n) => n.nodeId !== nodeId);
    });
  },
});

export const templateReducer = templateSlice.reducer;
