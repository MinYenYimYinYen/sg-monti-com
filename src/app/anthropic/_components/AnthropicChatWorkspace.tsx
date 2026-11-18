"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/style/components/button";
import { Checkbox } from "@/style/components/checkbox";
import { Label } from "@/style/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/style/components/select";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { ChatInput } from "@/app/claudeSession/components/ChatInput";
import { ChatMessageList } from "@/app/claudeSession/components/ChatMessageList";
import { UsageSummary } from "@/app/claudeSession/components/UsageSummary";
import { DEFAULT_MODEL, MAX_SYSTEM_CHARS, MODEL_OPTIONS, type AnthropicModelId } from "@/app/anthropic/anthropicConst";
import { latestContextTokens, parseModelId, sumConversationTotals } from "@/app/anthropic/anthropicLogic";
import { useAnthropicChat } from "@/app/anthropic/useAnthropicChat";
import { TEXTAREA_CLASS_NAME } from "@/app/knowledgeBase/editor/_components/editorFieldStyles";

export function AnthropicChatWorkspace() {
  const { turns, pendingText, sendPrompt, clearChat } = useAnthropicChat();
  const [model, setModel] = useState<AnthropicModelId>(DEFAULT_MODEL);
  const [system, setSystem] = useState("");
  const [demoToolsEnabled, setDemoToolsEnabled] = useState(false);

  const totals = sumConversationTotals(turns);
  const isSending = pendingText !== null;

  return (
    <PageLayout>
      <PageLayout.Header
        left={
          <>
            <Select value={model} onValueChange={(value) => setModel(parseModelId(value))}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map(({ modelId, label }) => (
                  <SelectItem key={modelId} value={modelId}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                id="anthropic-demo-tools"
                checked={demoToolsEnabled}
                onCheckedChange={(checked) => setDemoToolsEnabled(checked === true)}
              />
              <Label htmlFor="anthropic-demo-tools">Demo tool (current time)</Label>
            </div>
          </>
        }
        right={
          <Button variant="destructive" intensity="soft" size="sm" onClick={clearChat} disabled={isSending || turns.length === 0}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        }
      />
      <PageLayout.Body>
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 border-b border-border bg-card p-3">
            <textarea
              className={TEXTAREA_CLASS_NAME}
              rows={2}
              maxLength={MAX_SYSTEM_CHARS}
              value={system}
              placeholder="Optional system prompt: sets the role and rules for the whole conversation."
              onChange={(event) => setSystem(event.target.value)}
            />
          </div>
          <div className="min-h-0 flex-1">
            <ChatMessageList
              turns={turns}
              pendingText={pendingText}
              emptyText="Nothing here yet. Every prompt sends the whole conversation again, so the input count grows each turn."
            />
          </div>
          <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card p-3">
            <UsageSummary totals={totals} contextTokens={latestContextTokens(turns)} />
            <ChatInput
              disabled={isSending}
              onSendAction={(text) => void sendPrompt({ text, model, system, demoToolsEnabled })}
            />
          </div>
        </div>
      </PageLayout.Body>
    </PageLayout>
  );
}
