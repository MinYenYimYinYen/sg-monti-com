"use client";

import { useEffect, useRef } from "react";
import { Notice } from "@/app/permission/_components/Notice";
import { extractText, findToolUses } from "@/app/anthropic/anthropicLogic";
import { formatUsd } from "@/app/anthropic/anthropicPricing";
import type { ChatMessage, ChatTurn, TurnStats } from "@/app/anthropic/AnthropicTypes";
import { MarkdownView } from "@/lib/tiptap/MarkdownView";
import { cn } from "@/style/utils";

function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

function describeToolCalls(message: ChatMessage): string[] {
  return findToolUses(message.content).map((toolUse) => `Called ${toolUse.name} ${JSON.stringify(toolUse.input)}`);
}

function describeToolResults(message: ChatMessage): string[] {
  return message.content.flatMap((block) =>
    block.type === "tool_result" ? [`${block.is_error ? "Tool error" : "Tool result"}: ${block.content}`] : [],
  );
}

// The user's own text is shown as typed, so line breaks are kept. Assistant text is markdown and is
// laid out by the viewer, where preserved whitespace would double the spacing.
function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
        role === "user"
          ? "ml-auto whitespace-pre-wrap bg-primary text-primary-foreground"
          : "border border-border bg-card text-foreground",
      )}
    >
      {children}
    </div>
  );
}

function ToolLine({ text }: { text: string }) {
  return (
    <div className="max-w-[85%] truncate rounded-md bg-accent/10 px-3 py-1 font-mono text-xs text-muted-foreground" title={text}>
      {text}
    </div>
  );
}

function StatsLine({ stats }: { stats: TurnStats }) {
  return (
    <div className="text-xs text-muted-foreground">
      {formatCount(stats.inputTokens)} in, {formatCount(stats.outputTokens)} out, about {formatUsd(stats.costUsd)}
      {stats.apiCalls > 1 ? `, ${stats.apiCalls} model calls` : ""}
    </div>
  );
}

function TurnView({ turn }: { turn: ChatTurn }) {
  return (
    <div className="flex flex-col gap-2">
      <Bubble role="user">{extractText(turn.prompt.content)}</Bubble>
      {turn.replies.map((reply, replyIndex) => {
        const text = extractText(reply.content);
        const lines = reply.role === "assistant" ? describeToolCalls(reply) : describeToolResults(reply);
        return (
          <div key={replyIndex} className="flex flex-col gap-2">
            {lines.map((line, lineIndex) => (
              <ToolLine key={lineIndex} text={line} />
            ))}
            {reply.role === "assistant" && text !== "" ? (
              <Bubble role="assistant">
                <MarkdownView markdown={text} />
              </Bubble>
            ) : null}
          </div>
        );
      })}
      {turn.notice !== null ? <Notice tone="warning">{turn.notice}</Notice> : null}
      {turn.stats !== null ? <StatsLine stats={turn.stats} /> : null}
    </div>
  );
}

export function ChatMessageList({
  turns,
  pendingText,
  emptyText,
}: {
  turns: ChatTurn[];
  pendingText: string | null;
  /** Shown before the first prompt, so each screen can say what fits it. */
  emptyText: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keeps the newest message in view. This only moves the scroll position; it sets no state.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [turns.length, pendingText]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-6 p-4">
        {turns.length === 0 && pendingText === null ? (
          <div className="text-sm text-muted-foreground">{emptyText}</div>
        ) : null}
        {turns.map((turn, turnIndex) => (
          <TurnView key={turnIndex} turn={turn} />
        ))}
        {pendingText !== null ? (
          <div className="flex flex-col gap-2">
            <Bubble role="user">{pendingText}</Bubble>
            <div className="text-sm text-muted-foreground">Waiting for Claude...</div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
