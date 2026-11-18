"use client";

import { useState } from "react";
import { MAX_TOOL_ITERATIONS, type AnthropicModelId } from "@/app/anthropic/anthropicConst";
import { sendViaApi } from "@/app/anthropic/anthropicClient";
import { DEMO_TOOLS } from "@/app/anthropic/anthropicDemoTools";
import { buildTurnNotice, buildTurnStats, flattenConversation } from "@/app/anthropic/anthropicLogic";
import { runToolLoop } from "@/app/anthropic/anthropicToolLoop";
import type { ChatMessage, ChatTurn } from "@/app/anthropic/AnthropicTypes";
import { handleError } from "@/lib/errors/errorHandler";

type SendPromptParams = {
  text: string;
  model: AnthropicModelId;
  system: string;
  demoToolsEnabled: boolean;
};

/**
 * The conversation lives here, in local state, and the whole history is sent on every prompt:
 * the API remembers nothing between calls. Leaving the page loses it, on purpose.
 */
export function useAnthropicChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pendingText, setPendingText] = useState<string | null>(null);

  async function sendPrompt({ text, model, system, demoToolsEnabled }: SendPromptParams) {
    const trimmedText = text.trim();
    if (trimmedText === "" || pendingText !== null) return;

    const prompt: ChatMessage = { role: "user", content: [{ type: "text", text: trimmedText }] };
    setPendingText(trimmedText);

    try {
      const loop = await runToolLoop({
        send: sendViaApi,
        params: {
          model,
          system: system.trim() === "" ? undefined : system.trim(),
          messages: [...flattenConversation(turns), prompt],
        },
        tools: demoToolsEnabled ? DEMO_TOOLS : [],
      });

      // Toasted by handleError, and also kept on the turn so the failure stays visible in the chat.
      const errorMessage = loop.error === null ? null : handleError(loop.error).message;

      const turn: ChatTurn = {
        prompt,
        replies: loop.replies,
        stats: loop.usagePerCall.length > 0 ? buildTurnStats({ model, usagePerCall: loop.usagePerCall }) : null,
        notice: buildTurnNotice({
          stopReason: loop.stopReason,
          hitIterationCap: loop.hitIterationCap,
          maxIterations: MAX_TOOL_ITERATIONS,
          errorMessage,
          hasReply: loop.replies.length > 0,
        }),
      };
      setTurns((previousTurns) => [...previousTurns, turn]);
    } catch (e) {
      handleError(e);
    } finally {
      setPendingText(null);
    }
  }

  function clearChat() {
    setTurns([]);
  }

  return { turns, pendingText, sendPrompt, clearChat };
}
