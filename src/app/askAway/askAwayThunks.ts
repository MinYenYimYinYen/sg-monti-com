import type { AppThunk } from "@/store";
import { MAX_TOOL_ITERATIONS } from "@/app/anthropic/anthropicConst";
import { sendViaApi } from "@/app/anthropic/anthropicClient";
import { buildTurnNotice, buildTurnStats, flattenConversation } from "@/app/anthropic/anthropicLogic";
import { runToolLoop } from "@/app/anthropic/anthropicToolLoop";
import type { ChatMessage, ChatTurn } from "@/app/anthropic/AnthropicTypes";
import { ASK_AWAY_MODEL, ASK_AWAY_SESSION_KIND } from "@/app/askAway/askAwayConst";
import { collectMarkedTopicKeys } from "@/app/askAway/askAwayLogic";
import { buildAskAwaySystemPrompt } from "@/app/askAway/askAwayPrompt";
import { askAwaySelect } from "@/app/askAway/askAwaySelect";
import { askAwayActions } from "@/app/askAway/askAwaySlice";
import { createAskAwayTools } from "@/app/askAway/askAwayTools";
import { claudeSessionActions } from "@/app/claudeSession/claudeSessionSlice";
import { topicSelect } from "@/app/knowledgeBase/topic/topicSelect";
import { AppError } from "@/lib/errors/AppError";
import { handleError } from "@/lib/errors/errorHandler";

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

/**
 * Sends one prompt: the topic list goes in the system prompt, Claude marks topics through the tool, and
 * the finished turn is kept in state and saved in the background.
 *
 * A plain thunk rather than a hook or a `createStandardThunk`, because a prompt can take up to two
 * minutes and must finish even if the user navigates away, and because the tool has to read the store as
 * it is while the loop runs. It stays out of `uiSlice` on purpose: the chat shows its own waiting state.
 */
export const sendAskAwayPrompt =
  ({ text }: { text: string }): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const trimmedText = text.trim();
    const startState = getState();
    if (trimmedText === "" || askAwaySelect.pendingText(startState) !== null) return;

    const topics = topicSelect.docs(startState);
    if (topics.length === 0) {
      handleError(validationError("No topics are loaded yet. Try again in a moment."));
      return;
    }
    const systemPrompt = buildAskAwaySystemPrompt(topics);
    if (!systemPrompt.ok) {
      handleError(validationError(systemPrompt.message));
      return;
    }

    let sessionId = askAwaySelect.sessionId(startState);
    if (sessionId === null) {
      sessionId = crypto.randomUUID();
      dispatch(askAwayActions.sessionStarted(sessionId));
    }

    const previousTurns = askAwaySelect.turns(startState);
    const knownTopicKeys = topics.map((topic) => topic.topicKey);
    const prompt: ChatMessage = { role: "user", content: [{ type: "text", text: trimmedText }] };
    dispatch(askAwayActions.promptSent(trimmedText));

    try {
      const loop = await runToolLoop({
        send: sendViaApi,
        params: {
          model: ASK_AWAY_MODEL,
          system: systemPrompt.system,
          messages: [...flattenConversation(previousTurns), prompt],
        },
        tools: createAskAwayTools({ dispatch, getState }),
      });

      // Toasted by handleError, and also kept on the turn so the failure stays visible in the chat.
      const errorMessage = loop.error === null ? null : handleError(loop.error).message;

      const turn: ChatTurn = {
        prompt,
        replies: loop.replies,
        stats:
          loop.usagePerCall.length > 0
            ? buildTurnStats({ model: ASK_AWAY_MODEL, usagePerCall: loop.usagePerCall })
            : null,
        notice: buildTurnNotice({
          stopReason: loop.stopReason,
          hitIterationCap: loop.hitIterationCap,
          maxIterations: MAX_TOOL_ITERATIONS,
          errorMessage,
          hasReply: loop.replies.length > 0,
        }),
      };

      // Topics are rebuilt from what Claude actually kept, so a trimmed reply takes its markings with it.
      dispatch(
        askAwayActions.turnFinished({
          turn,
          currentTopicKeys: collectMarkedTopicKeys({ turns: [...previousTurns, turn], knownTopicKeys }),
        }),
      );

      // Saving is background work. If it fails the turn is still here, and the failure is toasted.
      dispatch(
        claudeSessionActions.appendTurn({
          params: { sessionId, kind: ASK_AWAY_SESSION_KIND, turn: { ...turn, system: systemPrompt.system } },
          config: { showLoading: false },
        }),
      );
    } catch (e) {
      handleError(e);
      dispatch(
        askAwayActions.turnFinished({
          turn: null,
          currentTopicKeys: collectMarkedTopicKeys({ turns: previousTurns, knownTopicKeys }),
        }),
      );
    }
  };
