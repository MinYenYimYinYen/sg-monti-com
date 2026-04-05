import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { TreeNodeDoc } from "./TemplateTypes";

const selectTreeNodeDocs = (state: AppState): TreeNodeDoc[] =>
  state.template.treeNodeDocs;

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
