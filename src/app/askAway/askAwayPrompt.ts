import { MAX_SYSTEM_CHARS } from "@/app/anthropic/anthropicConst";
import { MARK_TOPICS_TOOL_NAME } from "@/app/askAway/askAwayConst";
import type { TopicDoc } from "@/app/knowledgeBase/topic/TopicTypes";
import { renderPromptTemplate } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsLogic";

export type TopicCandidate = Pick<TopicDoc, "topicKey" | "description">;

export type AskAwaySystemPrompt = { ok: true; system: string } | { ok: false; message: string };

/** One line per topic: the key Claude must send back, and the description it decides from. */
function describeTopic(topic: TopicCandidate): string {
  const description = topic.description.replace(/\s+/g, " ").trim();
  return `- ${topic.topicKey}: ${description}`;
}

/**
 * The system prompt for every turn: the instructions from the knowledge base settings, then the topic
 * list, which the code owns so a prompt author cannot break topic injection. Topics are sorted by key
 * so the same topics always give the same text. Only `topicKey` and `description` are taken, so a
 * topic's signals never reach Claude. Fails instead of cutting the list, because a topic Claude cannot
 * see is a topic it cannot match.
 */
export function buildAskAwaySystemPrompt({
  template,
  topics,
}: {
  template: string;
  topics: TopicCandidate[];
}): AskAwaySystemPrompt {
  const sortedTopics = [...topics].sort((a, b) => a.topicKey.localeCompare(b.topicKey));
  const topicList =
    sortedTopics.length === 0 ? "(No topics have been set up yet.)" : sortedTopics.map(describeTopic).join("\n");
  const instructions = renderPromptTemplate({ template, values: { markTopicsToolName: MARK_TOPICS_TOOL_NAME } });
  const system = `${instructions}\n\nTopics:\n${topicList}`;

  if (system.length > MAX_SYSTEM_CHARS) {
    return {
      ok: false,
      message: `The prompt and topic list are too long to send (${system.length.toLocaleString("en-US")} characters, the limit is ${MAX_SYSTEM_CHARS.toLocaleString("en-US")}). Shorten the prompt in the knowledge base settings or shorten topic descriptions.`,
    };
  }
  return { ok: true, system };
}
