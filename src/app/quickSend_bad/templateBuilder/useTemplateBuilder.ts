import { useAppDispatch } from "@/lib/hooks/redux";
import {
  setSelectedNodeId,
  toggleNodeExpanded,
  setNodeExpanded,
  toggleBlockSelection,
  setSelectedBlockKeys,
  clearBlockSelection,
} from "./templateBuilderSlice";

/**
 * Hook for accessing templateBuilder actions.
 * Components should use useSelector with templateBuilderSelect for reading state.
 */
export function useTemplateBuilder() {
  const dispatch = useAppDispatch();

  return {
    selectNode: (nodeId: string | null) => dispatch(setSelectedNodeId(nodeId)),
    toggleNodeExpanded: (nodeId: string) => dispatch(toggleNodeExpanded(nodeId)),
    setNodeExpanded: (nodeId: string, expanded: boolean) =>
      dispatch(setNodeExpanded({ nodeId, expanded })),
    toggleBlockSelection: (blockKey: string) =>
      dispatch(toggleBlockSelection(blockKey)),
    setSelectedBlockKeys: (blockKeys: string[]) =>
      dispatch(setSelectedBlockKeys(blockKeys)),
    clearBlockSelection: () => dispatch(clearBlockSelection()),
  };
}
