import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

// state.templateBuilder.* references commented out: templateBuilder slice removed from store
const selectSelectedNodeId = (_state: AppState): string | null =>
  // state.templateBuilder.selectedNodeId;
  null;

const selectExpandedNodeIds = (_state: AppState): string[] =>
  // state.templateBuilder.expandedNodeIds;
  [];

const selectSelectedBlockKeys = (_state: AppState): string[] =>
  // state.templateBuilder.selectedBlockKeys;
  [];

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
