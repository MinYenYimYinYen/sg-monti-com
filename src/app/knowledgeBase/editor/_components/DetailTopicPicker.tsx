"use client";

import { useSelector } from "react-redux";
import { Badge, badgeVariants } from "@/style/components/badge";
import { cn } from "@/style/utils";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { topicEditorSelect } from "@/app/knowledgeBase/editor/topicEditorSelect";
import { useTopicEditor } from "@/app/knowledgeBase/editor/useTopicEditor";
import { toggleTopicKey } from "@/app/knowledgeBase/editor/topicEditorLogic";

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
    editTopicDetail({ topicKeys: toggleTopicKey({ topicKeys: draft.topicKeys, topicKey }) });
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {topics.map((topic) => {
        const isSelected = draft.topicKeys.includes(topic.topicKey);
        return (
          <button
            key={topic.topicKey}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => handleToggle(topic.topicKey)}
            className={cn(
              badgeVariants({ variant: isSelected ? "primary" : "outline", intensity: "soft" }),
              "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
              !isSelected && "border-input bg-card hover:bg-accent/10",
            )}
          >
            {topic.name}
          </button>
        );
      })}
    </div>
  );
}

