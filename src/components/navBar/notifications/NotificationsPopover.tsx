"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Inbox } from "lucide-react";
import { authSelect } from "@/app/auth/authSlice";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { Button } from "@/style/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { TopicDetailReviewDialog } from "@/app/knowledgeBase/editor/_components/TopicDetailReviewDialog";
import { CountDot } from "./CountDot";
import {
  KnowledgeBaseApprovalsLoader,
  useCanSeeKnowledgeBaseApprovals,
} from "./KnowledgeBaseApprovalsLoader";
import { PendingApprovalsList } from "./PendingApprovalsList";
import { PendingUsersList } from "./PendingUsersList";
import { PendingResetsList } from "./PendingResetsList";

export function NotificationsPopover() {
  const pendingUsers = useSelector(authSelect.adminPendingUsers);
  const pendingResets = useSelector(authSelect.adminPendingResets);
  const pendingApprovals = useSelector(
    knowledgeBaseSelect.detailsPendingMyApproval,
  );
  const canSeeApprovals = useCanSeeKnowledgeBaseApprovals();
  const totalPending =
    pendingUsers.length + pendingResets.length + pendingApprovals.length;
  const [open, setOpen] = useState(false);
  // Held here, not in the list: the popover content unmounts when it closes, and the dialog must outlive it.
  const [reviewDetailKey, setReviewDetailKey] = useState<string | null>(null);

  return (
    <>
      <TopicDetailReviewDialog
        detailKey={reviewDetailKey}
        onCloseAction={() => setReviewDetailKey(null)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <KnowledgeBaseApprovalsLoader />
        <PopoverTrigger asChild>
          <Button
            variant="accent"
            intensity="ghost"
            size="icon"
            className="relative"
            aria-label="Admin actions"
          >
            <Inbox className="h-5 w-5" />
            {totalPending > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {totalPending}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-[min(520px,calc(100vw-2rem))] overflow-hidden p-0"
        >
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
            <span className="text-sm font-semibold text-foreground">
              Admin Actions
            </span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-3">
            <Accordion type="single" collapsible>
              <AccordionItem value="users">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    Pending Users
                    <CountDot count={pendingUsers.length} />
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <PendingUsersList onCloseAction={() => setOpen(false)} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="resets">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    Password Resets
                    <CountDot count={pendingResets.length} />
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <PendingResetsList />
                </AccordionContent>
              </AccordionItem>
              {canSeeApprovals && (
                <AccordionItem value="approvals" className="last:border-b-0">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      Knowledge Base Approvals
                      <CountDot count={pendingApprovals.length} />
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <PendingApprovalsList
                      onReviewAction={(detailKey) => {
                        setOpen(false);
                        setReviewDetailKey(detailKey);
                      }}
                    />
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
