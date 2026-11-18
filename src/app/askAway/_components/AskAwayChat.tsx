"use client";

import { useSelector } from "react-redux";
import { askAwaySelect } from "@/app/askAway/askAwaySelect";
import { useAskAway } from "@/app/askAway/useAskAway";
import { ChatInput } from "@/app/claudeSession/components/ChatInput";
import { ChatMessageList } from "@/app/claudeSession/components/ChatMessageList";
import { UsageSummary } from "@/app/claudeSession/components/UsageSummary";

/** The conversation: messages, running cost and the input. */
export function AskAwayChat() {
  const turns = useSelector(askAwaySelect.turns);
  const pendingText = useSelector(askAwaySelect.pendingText);
  const totals = useSelector(askAwaySelect.totals);
  const contextTokens = useSelector(askAwaySelect.contextTokens);
  const { sendPrompt } = useAskAway();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
      <div className="min-h-0 flex-1">
        <ChatMessageList
          turns={turns}
          pendingText={pendingText}
          emptyText="Ask a question. Claude picks the topics it is about and answers from their documents."
        />
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t border-border p-3">
        <UsageSummary totals={totals} contextTokens={contextTokens} />
        <ChatInput
          disabled={pendingText !== null}
          placeholder="Ask about anything in the knowledge base. Enter sends, Shift+Enter adds a line."
          onSendAction={sendPrompt}
        />
      </div>
    </div>
  );
}
