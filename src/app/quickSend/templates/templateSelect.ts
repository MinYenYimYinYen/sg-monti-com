import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { TreeNodeDoc } from "@/app/quickSend/templates/TemplateTypes";

const selectTreeNodeDocs = (state: AppState): TreeNodeDoc[] =>
  state.template.treeNodeDocs;

const selectChildrenOf = createSelector(
  [selectTreeNodeDocs, (_: AppState, parentId: string | null) => parentId],
  (nodes, parentId) => {
    const children = nodes
      .filter((node) => node.parentId === parentId)
      .sort((a, b) => a.order - b.order);
    return children;
  },
);

export const templateSelect = {
  treeNodeDocs: selectTreeNodeDocs,
  childrenOf: selectChildrenOf,
};
