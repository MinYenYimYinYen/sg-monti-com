"use client";

import { useSelector } from "react-redux";
import { Notice } from "@/app/permission/_components/Notice";
import { Badge } from "@/style/components/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/style/components/tabs";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { topicEditorSelect } from "@/app/knowledgeBase/editor/topicEditorSelect";
import { TopicDetailForm } from "@/app/knowledgeBase/editor/_components/TopicDetailForm";
import { TopicDetailReview } from "@/app/knowledgeBase/editor/_components/TopicDetailReview";
import { TopicForm } from "@/app/knowledgeBase/editor/_components/TopicForm";
import { isEditorTab } from "@/app/knowledgeBase/workspace/knowledgeBaseWorkspaceLogic";
import { knowledgeBaseWorkspaceSelect } from "@/app/knowledgeBase/workspace/knowledgeBaseWorkspaceSelect";
import { useKnowledgeBaseWorkspace } from "@/app/knowledgeBase/workspace/useKnowledgeBaseWorkspace";

function UnsavedDot() {
  return <span title="Unsaved changes" className="ml-1.5 h-1.5 w-1.5 rounded-full bg-secondary" />;
}

function Placeholder({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{text}</div>;
}

/**
 * Column 3: the open topic, the open document, and where that document stands for approval. The tab
 * follows what was last opened, and the tab strip switches by hand.
 *
 * The Document tab stays mounted while hidden. The body editor keeps its undo history, cursor and
 * scroll position that way, so a look at the Approval tab does not cost the writer their place.
 */
export function WorkspaceEditorColumn() {
  const editorTab = useSelector(knowledgeBaseWorkspaceSelect.editorTab);
  const topicDraft = useSelector(topicEditorSelect.topicDraft);
  const topicIsDirty = useSelector(topicEditorSelect.topicIsDirty);
  const detailDraft = useSelector(topicEditorSelect.detailDraft);
  const detailKey = useSelector(topicEditorSelect.detailDraftKey);
  const detailIsDirty = useSelector(topicEditorSelect.detailIsDirty);
  const details = useSelector(knowledgeBaseSelect.details);
  const { setEditorTab } = useKnowledgeBaseWorkspace();

  const openDetail = detailDraft && !detailDraft.isNew && detailKey ? details.find((d) => d.detailKey === detailKey) : undefined;
  const isWaitingForApproval = openDetail?.status === "pending";

  return (
    <Tabs
      value={editorTab}
      onValueChange={(value) => {
        if (isEditorTab(value)) setEditorTab(value);
      }}
      className="min-w-0 flex-1"
    >
      <TabsList>
        <TabsTrigger value="topic">
          Topic
          {topicIsDirty && <UnsavedDot />}
        </TabsTrigger>
        <TabsTrigger value="document">
          Document
          {detailIsDirty && <UnsavedDot />}
        </TabsTrigger>
        <TabsTrigger value="approval">
          Approval
          {isWaitingForApproval && (
            <Badge variant="secondary" intensity="soft" className="ml-1.5 px-1.5 py-0 font-medium">
              Waiting
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="topic" className="block overflow-y-auto">
        {topicDraft ? <TopicForm /> : <Placeholder text="Select a topic to edit, or add a new one." />}
      </TabsContent>

      <TabsContent value="document" forceMount className="block overflow-y-auto data-[state=inactive]:hidden">
        {detailDraft ? (
          <TopicDetailForm showApproval={false} />
        ) : (
          <Placeholder text="Select a document to edit, or add a new one." />
        )}
      </TabsContent>

      <TabsContent value="approval" className="block overflow-y-auto">
        {openDetail && detailKey ? (
          <div className="max-w-3xl space-y-4 pb-6">
            {detailIsDirty && (
              <Notice tone="warning">
                You have unsaved changes. Approval applies to the saved version shown here, not to your edits.
              </Notice>
            )}
            <TopicDetailReview detailKey={detailKey} />
          </div>
        ) : (
          <Placeholder
            text={
              detailDraft?.isNew
                ? "Save the document to start its approval."
                : "Select a document to see where it stands for approval."
            }
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
