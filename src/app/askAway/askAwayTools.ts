import type { AppDispatch, AppState } from "@/store";
import { defineTool } from "@/app/anthropic/anthropicTools";
import type { AnthropicTool } from "@/app/anthropic/AnthropicTypes";
import { MARK_TOPICS_TOOL_NAME } from "@/app/askAway/askAwayConst";
import { buildMarkTopicsOutput, planTopicMarking } from "@/app/askAway/askAwayLogic";
import { markTopicsInputSchema } from "@/app/askAway/askAwaySchema";
import { askAwaySelect } from "@/app/askAway/askAwaySelect";
import { askAwayActions } from "@/app/askAway/askAwaySlice";
import { topicSelect } from "@/app/knowledgeBase/topic/topicSelect";
import { topicDetailSelect } from "@/app/knowledgeBase/topicDetail/topicDetailSelect";
import { htmlToMarkdown } from "@/lib/primatives/string/htmlToMarkdown";

/**
 * The tools Claude can call, bound to the store. They run in the browser and read state when they are
 * called, not when they are built, because a prompt can take several model calls and the marked topics
 * change between them. Everything they read is already loaded, so no tool call hits the network.
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
    input: markTopicsInputSchema,
    // Synchronous on purpose: reading state and dispatching happen in one step, so two calls in the same
    // model reply cannot both decide a topic is new.
    run: ({ topicKeys }) => {
      const state = getState();
      const plan = planTopicMarking({
        requestedTopicKeys: topicKeys,
        knownTopicKeys: topicSelect.docs(state).map((topic) => topic.topicKey),
        currentTopicKeys: askAwaySelect.currentTopicKeys(state),
        details: topicDetailSelect.docs(state),
      });

      // An error result goes back to Claude so it can correct the keys, and it is not counted as a marking.
      if (plan.validTopicKeys.length === 0) {
        throw new Error(`None of those keys are in the topic list: ${plan.unknownTopicKeys.join(", ")}.`);
      }
      if (plan.newlyMarkedTopicKeys.length > 0) {
        dispatch(askAwayActions.topicsMarked(plan.newlyMarkedTopicKeys));
      }

      const documents = plan.newDetails.map((detail) => ({
        title: detail.title,
        topicKeys: detail.topicKeys,
        markdown: htmlToMarkdown(detail.contentHtml),
      }));
      return buildMarkTopicsOutput({ plan, documents });
    },
  });

  return [markTopicsRelevant];
}
