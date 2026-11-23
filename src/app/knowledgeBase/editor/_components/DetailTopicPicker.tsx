"use client";

import { useSelector } from "react-redux";
import { Badge, badgeVariants } from "@/style/components/badge";
import { cn } from "@/style/utils";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { topicEditorSelect } from "@/app/knowledgeBase/editor/topicEditorSelect";
import { useTopicEditor } from "@/app/knowledgeBase/editor/useTopicEditor";
import { retitleForTopicChange, toggleTopicKey } from "@/app/knowledgeBase/editor/topicEditorLogic";
import { UNDOCUMENTED_TOPIC_CLASS_NAME } from "@/app/knowledgeBase/editor/_components/topicCoverageStyles";

/**
 * Chooses the topics an open document applies to, as badges named by the topic's title. Those topics are
 * the document's identity, so once the document is saved the picker is read-only and lists only the
 * topics it applies to. `disabled` means the user cannot write.
 */
export function DetailTopicPicker({ disabled }: { disabled: boolean }) {
  const topics = useSelector(knowledgeBaseSelect.topics);
  const draft = useSelector(topicEditorSelect.detailDraft);
  const { editTopicDetail } = useTopicEditor();

  if (!draft) return null;

  if (!draft.isNew) {
    const appliedTopics = topics.filter((topic) => draft.topicKeys.includes(topic.topicKey));
    return (
      <div className="flex flex-wrap gap-1.5">
        {appliedTopics.map((topic) => (
          <Badge key={topic.topicKey} variant="primary" intensity="soft">
            {topic.name}
          </Badge>
        ))}
      </div>
    );
  }

  if (topics.length === 0) {
    return <p className="text-xs text-muted-foreground">There are no topics yet. Create them on the Topics tab first.</p>;
  }

  const handleToggle = (topicKey: string) => {
    const topicKeys = toggleTopicKey({ topicKeys: draft.topicKeys, topicKey });
    const title = retitleForTopicChange({
      title: draft.title,
      previousTopicKeys: draft.topicKeys,
      nextTopicKeys: topicKeys,
    });
    editTopicDetail({ topicKeys, title });
  };

  const hasUndocumentedTopics = topics.some((topic) => topic.documents.length === 0);

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {topics.map((topic) => {
          const isSelected = draft.topicKeys.includes(topic.topicKey);
          const hasNoDocuments = topic.documents.length === 0;
          return (
            <button
              key={topic.topicKey}
              type="button"
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => handleToggle(topic.topicKey)}
              // Fill says whether the topic has documents, the border says whether it is selected, and
              // focus changes nothing, so a clicked badge never looks different from a selected one.
              className={cn(
                badgeVariants({ variant: "outline", intensity: "soft" }),
                "cursor-pointer border-2 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
                isSelected ? "border-primary" : "border-input",
                hasNoDocuments ? UNDOCUMENTED_TOPIC_CLASS_NAME : "bg-card hover:bg-accent/10",
              )}
            >
              {topic.name}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Selected topics have a blue border.
        {hasUndocumentedTopics && " Highlighted topics have no document yet."}
      </p>
    </>
  );
}

