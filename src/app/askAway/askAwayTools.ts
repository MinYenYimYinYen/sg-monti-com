import { z } from "zod";
import type { AppDispatch, AppState } from "@/store";
import { defineTool } from "@/app/anthropic/anthropicTools";
import type { AnthropicTool } from "@/app/anthropic/AnthropicTypes";
import { MARK_TOPICS_TOOL_NAME, MAX_TOPICS_PER_CALL } from "@/app/askAway/askAwayConst";
import { formatToday } from "@/app/askAway/_tools/getNowLogic";
import { markTopics } from "@/app/askAway/_tools/markTopicsLogic";

/**
 * The tools Claude can call: what each one is, with the code that runs it in `_tools/`. They run in
 * the browser and read state when called, not when built, because a prompt can take several model
 * calls. Everything they read is already loaded, so no tool call hits the network.
 */
export function createAskAwayTools({
  dispatch,
  getState,
}: {
  dispatch: AppDispatch;
  getState: () => AppState;
}): AnthropicTool[] {
  const markTopicsRelevant = defineTool({
    name: MARK_TOPICS_TOOL_NAME,
    description:
      "Marks topics from the topic list as relevant to the conversation and returns the documents for them, " +
      "converted to markdown. Documents for a topic that is already marked are not sent again.",
    input: z.object({
      topicKeys: z
        .array(z.string().min(1))
        .min(1)
        .max(MAX_TOPICS_PER_CALL)
        .describe("The topicKey of every topic from the topic list that the user's message is about."),
    }),
    // Synchronous on purpose: reading state and dispatching happen in one step, so two calls in the same
    // model reply cannot both decide a topic is new.
    run: ({ topicKeys }) => markTopics({ topicKeys, dispatch, getState }),
  });

  const getNow = defineTool({
    name: "getNow",
    description:
      "Returns today's date, to the day, with no time of day. " +
      "Call it only when the answer depends on today's date, such as a seasonal or timing window in a document, " +
      "how long until or since a date, or a phrase like 'this week' or 'next month'. " +
      "Do not call it when the question does not depend on the date.",
    input: z.object({}),
    run: () => formatToday({ now: new Date() }),
  });

  return [markTopicsRelevant, getNow];
}
