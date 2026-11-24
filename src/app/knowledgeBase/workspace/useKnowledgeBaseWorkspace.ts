import { useAppDispatch } from "@/lib/hooks/redux";
import type { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";
import { useTopicEditor } from "@/app/knowledgeBase/editor/useTopicEditor";
import { knowledgeBaseWorkspaceActions } from "@/app/knowledgeBase/workspace/knowledgeBaseWorkspaceSlice";
import type { DetailListScope, EditorTab } from "@/app/knowledgeBase/workspace/knowledgeBaseWorkspaceTypes";

/** Actions for the workspace page's own UI state. Components read it with `knowledgeBaseWorkspaceSelect`. */
export function useKnowledgeBaseWorkspace() {
  const dispatch = useAppDispatch();
  const { openTopicDetail } = useTopicEditor();

  const setEditorTab = (tab: EditorTab) => dispatch(knowledgeBaseWorkspaceActions.setEditorTab(tab));

  const setDetailListScope = (scope: DetailListScope) =>
    dispatch(knowledgeBaseWorkspaceActions.setDetailListScope(scope));

  /** Shows the document already open in the editor, leaving its draft (and any unsaved edits) alone. */
  const showDetailInEditor = () => dispatch(knowledgeBaseWorkspaceActions.showDetailInEditor());

  // Opening the draft keeps a reviewer on the Approval tab, so the tab is set after it.
  const openDetailInEditor = (detail: TopicDetailDoc) => {
    openTopicDetail(detail);
    showDetailInEditor();
  };

  return { setEditorTab, setDetailListScope, showDetailInEditor, openDetailInEditor };
}
