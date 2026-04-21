import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type TemplateBuilderState = {
  /** Currently selected node ID for editing in the right panel */
  selectedNodeId: string | null;

  /** Set of expanded category node IDs in the tree */
  expandedNodeIds: string[];

  /** Set of selected block keys for Create Group/Choice actions */
  selectedBlockKeys: string[];
};

const initialState: TemplateBuilderState = {
  selectedNodeId: null,
  expandedNodeIds: [],
  selectedBlockKeys: [],
};

const templateBuilderSlice = createSlice({
  name: "templateBuilder",
  initialState,
  reducers: {
    setSelectedNodeId: (state, action: PayloadAction<string | null>) => {
      state.selectedNodeId = action.payload;
      // Clear block selection when changing nodes
      state.selectedBlockKeys = [];
    },

    toggleNodeExpanded: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      const index = state.expandedNodeIds.indexOf(nodeId);
      if (index >= 0) {
        state.expandedNodeIds.splice(index, 1);
      } else {
        state.expandedNodeIds.push(nodeId);
      }
    },

    setNodeExpanded: (
      state,
      action: PayloadAction<{ nodeId: string; expanded: boolean }>
    ) => {
      const { nodeId, expanded } = action.payload;
      const index = state.expandedNodeIds.indexOf(nodeId);
      if (expanded && index === -1) {
        state.expandedNodeIds.push(nodeId);
      } else if (!expanded && index >= 0) {
        state.expandedNodeIds.splice(index, 1);
      }
    },

    toggleBlockSelection: (state, action: PayloadAction<string>) => {
      const blockKey = action.payload;
      const index = state.selectedBlockKeys.indexOf(blockKey);
      if (index >= 0) {
        state.selectedBlockKeys.splice(index, 1);
      } else {
        state.selectedBlockKeys.push(blockKey);
      }
    },

    setSelectedBlockKeys: (state, action: PayloadAction<string[]>) => {
      state.selectedBlockKeys = action.payload;
    },

    clearBlockSelection: (state) => {
      state.selectedBlockKeys = [];
    },
  },
});

export const {
  setSelectedNodeId,
  toggleNodeExpanded,
  setNodeExpanded,
  toggleBlockSelection,
  setSelectedBlockKeys,
  clearBlockSelection,
} = templateBuilderSlice.actions;

export const templateBuilderReducer = templateBuilderSlice.reducer;
