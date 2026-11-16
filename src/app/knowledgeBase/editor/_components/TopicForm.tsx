"use client";

import { useSelector } from "react-redux";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { Notice } from "@/app/permission/_components/Notice";
import { FormGroup } from "@/components/FormGroup";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { topicSelect } from "@/app/knowledgeBase/topic/topicSelect";
import { topicEditorSelect } from "@/app/knowledgeBase/editor/topicEditorSelect";
import { useTopicEditor } from "@/app/knowledgeBase/editor/useTopicEditor";
import { TOPIC_KEY_RULE } from "@/app/knowledgeBase/topic/topicLogic";
import { TEXTAREA_CLASS_NAME } from "@/app/knowledgeBase/editor/_components/editorFieldStyles";
import { TopicKeyBadges } from "@/app/knowledgeBase/editor/_components/TopicKeyBadges";

/** The open topic's fields and its backlinks. Renders nothing while no topic is open. */
export function TopicForm() {
  const draft = useSelector(topicEditorSelect.topicDraft);
  const keyError = useSelector(topicEditorSelect.topicKeyError);
  const keyConflict = useSelector(topicEditorSelect.topicKeyConflict);
  const documents = useSelector(topicEditorSelect.activeTopicDocuments);
  const topicsByKey = useSelector(topicSelect.docsByKey);
  const canWrite = useSelector(userCapabilitiesSelect.allows)(can.knowledgeTopics.write);
  const { editTopic, openTopic } = useTopicEditor();

  if (!draft) return null;

  const existingTopic = keyConflict ? topicsByKey.get(draft.topicKey) : undefined;
  const readOnly = !canWrite;

  return (
    <div className="max-w-2xl space-y-4 pb-6">
      <FormGroup>
        <Label>Key *</Label>
        <Input
          value={draft.topicKey}
          disabled={!draft.isNew || readOnly}
          placeholder="aeration"
          onChange={(event) => editTopic({ topicKey: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          {draft.isNew
            ? `Can't be changed after saving. ${TOPIC_KEY_RULE}`
            : "The key can't be changed, because documents refer to it."}
        </p>
        {keyError && <p className="text-xs text-destructive">{keyError}</p>}
        {keyConflict && (
          <Notice tone="warning">
            <div className="flex items-center justify-between gap-3">
              <span>A topic with this key already exists. Saving would replace it.</span>
              {existingTopic && (
                <Button size="sm" variant="outline" onClick={() => openTopic(existingTopic)}>
                  Open it instead
                </Button>
              )}
            </div>
          </Notice>
        )}
      </FormGroup>

      <FormGroup>
        <Label>Name *</Label>
        <Input
          value={draft.name}
          disabled={readOnly}
          placeholder="Aeration"
          onChange={(event) => editTopic({ name: event.target.value })}
        />
      </FormGroup>

      <FormGroup>
        <Label>Description *</Label>
        <textarea
          className={TEXTAREA_CLASS_NAME}
          value={draft.description}
          disabled={readOnly}
          placeholder="The caller asks about core aeration, or about scheduling or pricing an aeration."
          onChange={(event) => editTopic({ description: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Claude reads this, and only this, to decide whether the topic applies to a call. Say when it fits, in a sentence or
          two.
        </p>
      </FormGroup>

      <FormGroup>
        <Label>Signals</Label>
        <textarea
          className={TEXTAREA_CLASS_NAME}
          value={draft.signalsText}
          disabled={readOnly}
          placeholder={"aerat\ncore plug"}
          onChange={(event) => editTopic({ signalsText: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          One phrase per line. The desktop app matches these against the live transcript without calling Claude, and uses a
          match to suggest this topic&apos;s documents. Saved in lowercase. Claude never sees them.
        </p>
      </FormGroup>

      <div className="space-y-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Documents tagged with this topic</h3>
        {draft.isNew && (
          <p className="text-xs text-muted-foreground">Documents appear here once the topic is saved.</p>
        )}
        {!draft.isNew && documents.length === 0 && (
          <p className="text-xs text-muted-foreground">No documents yet. Add one on the Documents tab.</p>
        )}
        <ul className="space-y-2">
          {documents.map((document) => (
            <li key={document.detailKey} className="rounded-md border border-border bg-card px-3 py-2">
              <div className="text-sm font-medium text-foreground">{document.title}</div>
              <TopicKeyBadges topicKeys={document.topicKeys} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
