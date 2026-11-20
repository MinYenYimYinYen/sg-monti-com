"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Pencil } from "lucide-react";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/style/components/accordion";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/style/components/tooltip";
import { askAwaySelect } from "@/app/askAway/askAwaySelect";
import { AskAwayDocumentBody } from "@/app/askAway/_components/AskAwayDocumentBody";
import { TopicDetailQuickEditDialog } from "@/app/askAway/_components/TopicDetailQuickEditDialog";
import { TopicKeyBadges } from "@/app/knowledgeBase/editor/_components/TopicKeyBadges";
import { useTopicEditor } from "@/app/knowledgeBase/editor/useTopicEditor";
import { topicDetailSelect } from "@/app/knowledgeBase/topicDetail/topicDetailSelect";

/** The documents that apply to the topics marked so far, general to specific. */
export function AskAwayDocuments() {
  const details = useSelector(askAwaySelect.currentDetails);
  const pendingDetailKeys = useSelector(askAwaySelect.pendingDetailKeySet);
  const headDocsByKey = useSelector(topicDetailSelect.headDocsByKey);
  const canWrite = useSelector(userCapabilitiesSelect.allows)(can.knowledgeTopics.write);
  const { openTopicDetail } = useTopicEditor();
  const [isEditOpen, setIsEditOpen] = useState(false);

  // The panel shows the live version, but an edit always starts from the head: the server refuses a
  // save built on anything else.
  function startEdit(detailKey: string) {
    const head = headDocsByKey.get(detailKey);
    if (!head) return;
    openTopicDetail(head);
    setIsEditOpen(true);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <h2 className="shrink-0 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Documents in use
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {details.length === 0 && (
          <p className="px-1 py-2 text-xs italic text-muted-foreground">
            Documents appear here when Claude marks a topic that has them.
          </p>
        )}
        <TooltipProvider>
          <Accordion type="single" collapsible className="space-y-2">
            {details.map((detail) => (
              <AccordionItem
                key={detail.detailKey}
                value={detail.detailKey}
                className="rounded-md border border-border bg-card px-3"
              >
                <AccordionTrigger
                  className="gap-2 py-2 hover:no-underline"
                  trailing={
                    canWrite ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="primary"
                            intensity="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            aria-label="Edit"
                            onClick={() => startEdit(detail.detailKey)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                    ) : undefined
                  }
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 truncate text-sm font-semibold text-foreground">{detail.title}</span>
                      {pendingDetailKeys.has(detail.detailKey) && (
                        <Badge variant="secondary" intensity="soft" className="shrink-0 px-1.5 py-0 font-medium">
                          Newer version waiting
                        </Badge>
                      )}
                    </span>
                    <TopicKeyBadges topicKeys={detail.topicKeys} />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <AskAwayDocumentBody
                    key={`${detail.detailKey}|${detail.updatedAt}`}
                    contentHtml={detail.contentHtml}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TooltipProvider>
      </div>
      <TopicDetailQuickEditDialog open={isEditOpen} onCloseAction={() => setIsEditOpen(false)} />
    </div>
  );
}
