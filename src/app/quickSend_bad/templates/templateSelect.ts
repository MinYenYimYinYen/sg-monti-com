import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { TreeNodeDoc } from "./TemplateTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selectTreeNodeDocs = (_state: AppState): TreeNodeDoc[] =>
  // state.template.treeNodeDocs; // commented out: template slice removed from store
  [];

/** Returns children of a given parentId, sorted by order. */
const makeChildrenOf = (parentId: string | null) =>
  createSelector([selectTreeNodeDocs], (nodes) =>
    nodes
      .filter((n) => n.parentId === parentId)
      .sort((a, b) => a.order - b.order),
  );

/** Returns a single node by nodeId. */
const makeNodeById = (nodeId: string) =>
  createSelector(
    [selectTreeNodeDocs],
    (nodes) => nodes.find((n) => n.nodeId === nodeId) ?? null,
  );

export const templateSelect = {
  treeNodeDocs: selectTreeNodeDocs,
  childrenOf: makeChildrenOf,
  nodeById: makeNodeById,
};
