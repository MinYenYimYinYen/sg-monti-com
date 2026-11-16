"use client";

import { useSelector } from "react-redux";
import { Checkbox } from "@/style/components/checkbox";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { topicEditorSelect } from "@/app/knowledgeBase/editor/topicEditorSelect";
import { useTopicEditor } from "@/app/knowledgeBase/editor/useTopicEditor";
import { toggleTopicKey } from "@/app/knowledgeBase/editor/topicEditorLogic";

/**
 * Chooses the topics an open document applies to. Those topics are the document's identity, so the
 * parent disables the picker once the document is saved.
 */
export function DetailTopicPicker({ disabled }: { disabled: boolean }) {
  const topics = useSelector(knowledgeBaseSelect.topics);
  const draft = useSelector(topicEditorSelect.detailDraft);
  const { editTopicDetail } = useTopicEditor();

  if (!draft) return null;

  if (topics.length === 0) {
    return <p className="text-xs text-muted-foreground">There are no topics yet. Create them on the Topics tab first.</p>;
  }

  const handleToggle = (topicKey: string) => {
    editTopicDetail({ topicKeys: toggleTopicKey({ topicKeys: draft.topicKeys, topicKey }) });
  };

  return (
    <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-md border border-input bg-card p-2">
      {topics.map((topic) => (
        <label
          key={topic.topicKey}
          className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-accent/10"
        >
          <Checkbox
            checked={draft.topicKeys.includes(topic.topicKey)}
            disabled={disabled}
            onCheckedChange={() => handleToggle(topic.topicKey)}
          />
          <span className="font-medium text-foreground">{topic.name}</span>
          <span className="text-xs text-muted-foreground">{topic.topicKey}</span>
        </label>
      ))}
    </div>
  );
}
