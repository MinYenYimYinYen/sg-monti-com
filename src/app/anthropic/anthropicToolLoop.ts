import { MAX_TOOL_ITERATIONS } from "@/app/anthropic/anthropicConst";
import {
  buildToolResultMessage,
  findToolUses,
  trimToLastCompleteReply,
  truncateToolResult,
} from "@/app/anthropic/anthropicLogic";
import type {
  AnthropicStopReason,
  AnthropicTool,
  ChatMessage,
  SendMessageParams,
  SendMessageResult,
  TokenUsage,
  ToolResultBlock,
  ToolUseBlock,
} from "@/app/anthropic/AnthropicTypes";

export type ToolLoopResult = {
  /** The new messages for this prompt, trimmed so the history is safe to send again. */
  replies: ChatMessage[];
  /** One entry per model call, including calls whose reply was later trimmed away. */
  usagePerCall: TokenUsage[];
  stopReason: AnthropicStopReason | null;
  hitIterationCap: boolean;
  /** True when the last allowed call was sent with tools switched off, so the model had to answer. */
  forcedFinalAnswer: boolean;
  /** A failed model call. It ends the loop and keeps whatever completed before it. */
  error: unknown;
};

type RunToolLoopParams = {
  /** Injected so the loop runs without a network, in tests and in the desktop app alike. */
  send: (params: SendMessageParams) => Promise<SendMessageResult>;
  /** Everything except tools: the history already ends with the new prompt. */
  params: Omit<SendMessageParams, "tools">;
  tools: AnthropicTool[];
  maxIterations?: number;
};

async function runOneTool({
  toolUse,
  toolsByName,
}: {
  toolUse: ToolUseBlock;
  toolsByName: Map<string, AnthropicTool>;
}): Promise<ToolResultBlock> {
  const tool = toolsByName.get(toolUse.name);
  if (!tool) {
    return { type: "tool_result", tool_use_id: toolUse.id, content: `Unknown tool '${toolUse.name}'.`, is_error: true };
  }
  try {
    const output = await tool.run(toolUse.input);
    return { type: "tool_result", tool_use_id: toolUse.id, content: truncateToolResult(output) };
  } catch (e) {
    // The model sees the failure and can correct its input or explain, so one bad call never ends the loop.
    const message = e instanceof Error ? e.message : "The tool failed.";
    return { type: "tool_result", tool_use_id: toolUse.id, content: truncateToolResult(message), is_error: true };
  }
}

/**
 * Sends the conversation, runs any tools the model asks for, and repeats until the model answers
 * or the iteration cap is reached. The last allowed call may not use a tool, so a run that would have
 * been cut off ends with an answer instead. Without tools it is exactly one call.
 */
export async function runToolLoop({
  send,
  params,
  tools,
  maxIterations = MAX_TOOL_ITERATIONS,
}: RunToolLoopParams): Promise<ToolLoopResult> {
  const toolSchemas = tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const replies: ChatMessage[] = [];
  const usagePerCall: TokenUsage[] = [];
  let stopReason: AnthropicStopReason | null = null;
  let error: unknown = null;
  let answered = false;
  let forcedFinalAnswer = false;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    // Never on the first call: with a cap of 1 that would switch the tools off for the whole run.
    const isLastCall = tools.length > 0 && iteration > 0 && iteration === maxIterations - 1;
    if (isLastCall) forcedFinalAnswer = true;

    let result: SendMessageResult;
    try {
      result = await send({
        ...params,
        messages: [...params.messages, ...replies],
        tools: toolSchemas.length > 0 ? toolSchemas : undefined,
        toolChoice: isLastCall ? "none" : undefined,
      });
    } catch (e) {
      error = e;
      break;
    }

    usagePerCall.push(result.usage);
    stopReason = result.stopReason;
    if (result.content.length > 0) replies.push({ role: "assistant", content: result.content });

    const toolUses = findToolUses(result.content);
    if (result.stopReason !== "tool_use" || toolUses.length === 0) {
      answered = true;
      break;
    }

    const toolResults = await Promise.all(toolUses.map((toolUse) => runOneTool({ toolUse, toolsByName })));
    replies.push(buildToolResultMessage(toolResults));
  }

  return {
    replies: trimToLastCompleteReply(replies),
    usagePerCall,
    stopReason,
    hitIterationCap: error === null && !answered,
    forcedFinalAnswer,
    error,
  };
}
