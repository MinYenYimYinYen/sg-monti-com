"use client";

import { useSelector } from "react-redux";
import { Trash2 } from "lucide-react";
import { Button } from "@/style/components/button";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { askAwaySelect } from "@/app/askAway/askAwaySelect";
import { useAskAway } from "@/app/askAway/useAskAway";
import { useAskAwayDeps } from "@/app/askAway/useAskAwayDeps";
import { AskAwayChat } from "@/app/askAway/_components/AskAwayChat";
import { AskAwayDocuments } from "@/app/askAway/_components/AskAwayDocuments";
import { AskAwayTopicList } from "@/app/askAway/_components/AskAwayTopicList";

/** Topics on the left, the conversation in the middle, the documents Claude is using on the right. */
export function AskAwayWorkspace() {
  useAskAwayDeps();
  const turns = useSelector(askAwaySelect.turns);
  const pendingText = useSelector(askAwaySelect.pendingText);
  const { clearConversation } = useAskAway();

  return (
    <PageLayout>
      <PageLayout.Header
        left={<h1 className="text-sm font-semibold text-foreground">Ask Away</h1>}
        right={
          <Button
            variant="destructive"
            intensity="soft"
            size="sm"
            onClick={clearConversation}
            disabled={pendingText !== null || turns.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        }
      />
      <PageLayout.Body>
        <div className="flex h-full gap-4 overflow-hidden p-4">
          <div className="h-full w-[260px] shrink-0">
            <AskAwayTopicList />
          </div>
          <div className="h-full min-w-0 flex-1">
            <AskAwayChat />
          </div>
          <div className="h-full w-[420px] shrink-0">
            <AskAwayDocuments />
          </div>
        </div>
      </PageLayout.Body>
    </PageLayout>
  );
}
