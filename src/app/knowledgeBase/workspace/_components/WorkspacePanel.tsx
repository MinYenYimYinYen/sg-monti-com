import { WorkspaceDetailColumn } from "@/app/knowledgeBase/workspace/_components/WorkspaceDetailColumn";
import { WorkspaceEditorColumn } from "@/app/knowledgeBase/workspace/_components/WorkspaceEditorColumn";
import { WorkspaceTopicColumn } from "@/app/knowledgeBase/workspace/_components/WorkspaceTopicColumn";

/** Topics, documents and the editor on one page, so the writer never has to change pages to follow a topic. */
export function WorkspacePanel() {
  return (
    <div className="flex h-full gap-4 overflow-hidden p-4">
      <WorkspaceTopicColumn />
      <WorkspaceDetailColumn />
      <WorkspaceEditorColumn />
    </div>
  );
}
