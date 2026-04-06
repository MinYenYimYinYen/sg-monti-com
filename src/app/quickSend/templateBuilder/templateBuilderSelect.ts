import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

const selectSelectedNodeId = (state: AppState) =>
  state.templateBuilder.selectedNodeId;

const selectExpandedNodeIds = (state: AppState) =>
  state.templateBuilder.expandedNodeIds;

const selectSelectedBlockKeys = (state: AppState) =>
  state.templateBuilder.selectedBlockKeys;

const selectExpandedNodeIdSet = createSelector(
  [selectExpandedNodeIds],
  (expandedNodeIds) => new Set(expandedNodeIds)
);

const selectSelectedBlockKeySet = createSelector(
  [selectSelectedBlockKeys],
  (selectedBlockKeys) => new Set(selectedBlockKeys)
);

const selectCanCreateGroup = createSelector(
  [selectSelectedBlockKeys],
  (selectedBlockKeys) => selectedBlockKeys.length >= 2
);

export const templateBuilderSelect = {
  selectedNodeId: selectSelectedNodeId,
  expandedNodeIds: selectExpandedNodeIds,
  selectedBlockKeys: selectSelectedBlockKeys,
  expandedNodeIdSet: selectExpandedNodeIdSet,
  selectedBlockKeySet: selectSelectedBlockKeySet,
  canCreateGroup: selectCanCreateGroup,
};
