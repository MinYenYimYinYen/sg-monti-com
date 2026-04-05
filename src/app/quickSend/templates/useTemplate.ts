import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import {
  getTreeNodes,
  createNode,
  updateNode,
  deleteNode,
} from "./templateSlice";
import { TreeNodeDoc } from "./TemplateTypes";

export function useTemplate({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        getTreeNodes({
          params: {},
          config: { loadingMsg: "Loading templates..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const addNode = (node: TreeNodeDoc) =>
    dispatch(
      createNode({
        params: { node },
        config: { showLoading: false, force: true },
      }),
    );

  const saveNode = (node: TreeNodeDoc) =>
    dispatch(
      updateNode({
        params: { node },
        config: { showLoading: false, force: true },
      }),
    );

  const removeNode = (nodeId: string) =>
    dispatch(
      deleteNode({
        params: { nodeId },
        config: { showLoading: false, force: true },
      }),
    );

  return { addNode, saveNode, removeNode };
}
