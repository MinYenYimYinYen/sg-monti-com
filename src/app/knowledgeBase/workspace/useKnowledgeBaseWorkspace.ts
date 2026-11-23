import { useAppDispatch } from "@/lib/hooks/redux";
import { knowledgeBaseWorkspaceActions } from "@/app/knowledgeBase/workspace/knowledgeBaseWorkspaceSlice";
import type { DetailListScope, EditorTab } from "@/app/knowledgeBase/workspace/knowledgeBaseWorkspaceTypes";

/** Actions for the workspace page's own UI state. Components read it with `knowledgeBaseWorkspaceSelect`. */
export function useKnowledgeBaseWorkspace() {
  const dispatch = useAppDispatch();

  const setEditorTab = (tab: EditorTab) => dispatch(knowledgeBaseWorkspaceActions.setEditorTab(tab));

  const setDetailListScope = (scope: DetailListScope) =>
    dispatch(knowledgeBaseWorkspaceActions.setDetailListScope(scope));

  return { setEditorTab, setDetailListScope };
}
