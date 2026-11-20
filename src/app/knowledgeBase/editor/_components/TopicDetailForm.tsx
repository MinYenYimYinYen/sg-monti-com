"use client";

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
  const headDocsByKey = useSelector(topicDetailSelect.headDocsByKey);
  const detailsWithTopics = useSelector(knowledgeBaseSelect.details);
  const canWrite = useSelector(userCapabilitiesSelect.allows)(can.knowledgeTopics.write);
  const { editTopicDetail, openTopicDetail } = useTopicEditor();

  if (!draft) return null;

  const existingDetail = keyConflict && detailKey ? headDocsByKey.get(detailKey) : undefined;
  const missingTopicKeys = detailsWithTopics.find((detail) => detail.detailKey === detailKey)?.missingTopicKeys ?? [];
  const readOnly = !canWrite;

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
        {detailKey && <p className="text-xs text-muted-foreground">Document key: {detailKey}</p>}
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
          value={draft.title}
          disabled={readOnly}
          placeholder="Selling aeration"
          onChange={(event) => editTopicDetail({ title: event.target.value })}
        />
      </FormGroup>

      <FormGroup>
        <TopicDetailBodyEditor key={draftVersion} initialHtml={draft.contentHtml} disabled={readOnly} />
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
