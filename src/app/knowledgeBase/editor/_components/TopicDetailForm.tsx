"use client";

import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { Notice } from "@/app/permission/_components/Notice";
import { FormGroup } from "@/components/FormGroup";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { TopicDetailApprovalPanel } from "@/app/knowledgeBase/editor/_components/TopicDetailApprovalPanel";
import { topicDetailSelect } from "@/app/knowledgeBase/topicDetail/topicDetailSelect";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { topicEditorSelect } from "@/app/knowledgeBase/editor/topicEditorSelect";
import { useTopicEditor } from "@/app/knowledgeBase/editor/useTopicEditor";
import { DetailTopicPicker } from "@/app/knowledgeBase/editor/_components/DetailTopicPicker";
import { TopicDetailBodyEditor } from "@/app/knowledgeBase/editor/_components/TopicDetailBodyEditor";

/** The open document's topics, title and body. Renders nothing while no document is open. */
export function TopicDetailForm() {
  const draft = useSelector(topicEditorSelect.detailDraft);
  const draftVersion = useSelector(topicEditorSelect.detailDraftVersion);
  const detailKey = useSelector(topicEditorSelect.detailDraftKey);
  const keyConflict = useSelector(topicEditorSelect.detailKeyConflict);
  const isOutOfDate = useSelector(topicEditorSelect.detailIsOutOfDate);
  const canEditContent = useSelector(topicEditorSelect.detailCanEditContent);
  const headDocsByKey = useSelector(topicDetailSelect.headDocsByKey);
  const detailsWithTopics = useSelector(knowledgeBaseSelect.details);
  const canWrite = useSelector(userCapabilitiesSelect.allows)(can.knowledgeTopics.write);
  const { editTopicDetail, openTopicDetail } = useTopicEditor();
  const titleRef = useRef<HTMLInputElement>(null);

  const isNewDraft = draft?.isNew ?? false;
  const shouldFocusTitle = isNewDraft && canEditContent && canWrite && detailKey !== null;

  // A new, valid topic set is what unlocks the title, so the cursor moves there with the suggestion
  // selected, ready to be typed over. It fires when the topic set changes, not on every keystroke.
  useEffect(() => {
    if (!shouldFocusTitle) return;
    titleRef.current?.focus();
    titleRef.current?.select();
  }, [shouldFocusTitle, detailKey]);

  if (!draft) return null;

  const existingDetail = keyConflict && detailKey ? headDocsByKey.get(detailKey) : undefined;
  const missingTopicKeys = detailsWithTopics.find((detail) => detail.detailKey === detailKey)?.missingTopicKeys ?? [];
  const readOnly = !canWrite;
  // The topics stay editable while the content is locked, since choosing them is how it gets unlocked.
  const contentLocked = readOnly || !canEditContent;
  const needsTopics = draft.isNew && detailKey === null;

  return (
    <div className="max-w-3xl space-y-4 pb-6">
      <FormGroup>
        <Label>{draft.isNew ? "Applies to *" : "Applies to"}</Label>
        <DetailTopicPicker disabled={readOnly} />
        {draft.isNew && (
          <p className="text-xs text-muted-foreground">
            A document loads when all of its topics are matched. Choose one topic for general guidance, or several for
            guidance that only applies when they come up together.
          </p>
        )}
        {detailKey && <p className="text-sm font-bold text-foreground">Document key: {detailKey}</p>}
        {missingTopicKeys.length > 0 && (
          <Notice tone="warning">These topics no longer exist: {missingTopicKeys.join(", ")}.</Notice>
        )}
        {keyConflict && (
          <Notice tone="warning">
            <div className="flex items-center justify-between gap-3">
              <span>A document for exactly these topics already exists. Open it to edit it.</span>
              {existingDetail && (
                <Button size="sm" variant="outline" onClick={() => openTopicDetail(existingDetail)}>
                  Open it instead
                </Button>
              )}
            </div>
          </Notice>
        )}
      </FormGroup>

      {isOutOfDate && (
        <Notice tone="warning">
          <div className="flex items-center justify-between gap-3">
            <span>
              Someone saved a newer version of this document while you were editing. Saving now would be refused, so
              your changes would have to be made again on the latest version.
            </span>
            {detailKey && headDocsByKey.get(detailKey) && (
              <Button size="sm" variant="outline" onClick={() => openTopicDetail(headDocsByKey.get(detailKey)!)}>
                Open the latest
              </Button>
            )}
          </div>
        </Notice>
      )}

      <FormGroup>
        <Label>Title *</Label>
        <Input
          ref={titleRef}
          value={draft.title}
          disabled={contentLocked}
          placeholder="Selling aeration"
          onChange={(event) => editTopicDetail({ title: event.target.value })}
        />
        {needsTopics && (
          <p className="text-xs text-muted-foreground">Choose at least one topic above to start writing.</p>
        )}
      </FormGroup>

      <FormGroup>
        <TopicDetailBodyEditor key={draftVersion} initialHtml={draft.contentHtml} disabled={contentLocked} />
      </FormGroup>

      {!draft.isNew && detailKey && (
        <>
          <p className="text-xs text-muted-foreground">
            Every save is a new version. It is approved once every approver has approved it, and you approve it
            yourself if you are one. Until then the AI keeps using the last approved version.
          </p>
          <TopicDetailApprovalPanel detailKey={detailKey} />
        </>
      )}
    </div>
  );
}
