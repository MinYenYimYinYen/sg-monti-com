import { MAX_SYSTEM_CHARS } from "@/app/anthropic/anthropicConst";
import { MARK_TOPICS_TOOL_NAME } from "@/app/askAway/askAwayConst";
import type { TopicDoc } from "@/app/knowledgeBase/topic/TopicTypes";
import { renderPromptTemplate } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsLogic";

export type TopicCandidate = Pick<TopicDoc, "topicKey" | "description">;

/** Only the tags matter here, so the prompt does not depend on the document's shape. */
export type TaggedDocument = { topicKeys: string[] };

export type AskAwaySystemPrompt = { ok: true; system: string } | { ok: false; message: string };

/**
 * How to use tools at all, whichever tools exist. Code-owned like the topic list, so a prompt author
 * cannot drop it, and it lives here so no tool description has to mention another tool.
 */
const TOOL_RULES = [
  "Using tools:",
  "- When you need several tools and none depends on another's result, call them in the same reply.",
  "- Do not repeat a tool call whose result is already in the conversation.",
  "- Once you have what you need, answer.",
].join("\n");

/**
 * For each topic, the other topics it shares a document with. A document only applies when all of its
 * tags are marked, and Claude cannot see which documents exist, so without this it has no way to know
 * that marking one topic and not another leaves a document unread. Partners are sorted so the same
 * documents always give the same text.
 */
export function findCombinationPartners({ details }: { details: TaggedDocument[] }): Map<string, string[]> {
  const partners = new Map<string, Set<string>>();
  for (const { topicKeys } of details) {
    if (topicKeys.length < 2) continue;
    for (const topicKey of topicKeys) {
      const others = partners.get(topicKey) ?? new Set<string>();
      for (const other of topicKeys) {
        if (other !== topicKey) others.add(other);
      }
      partners.set(topicKey, others);
    }
  }
  return new Map([...partners].map(([topicKey, others]) => [topicKey, [...others].sort()]));
}

/**
 * One line per topic: the key Claude must send back, and the description it decides from, plus the
 * topics it has combined documents with. The hint is advisory: Claude still decides what is relevant.
 */
function describeTopic({ topic, partners }: { topic: TopicCandidate; partners: string[] }): string {
  const description = topic.description.replace(/\s+/g, " ").trim();
  const hint = partners.length > 0 ? ` (Has documents combined with: ${partners.join(", ")}.)` : "";
  return `- ${topic.topicKey}: ${description}${hint}`;
}

/**
 * The system prompt for every turn: the instructions from the knowledge base settings, then the tool
 * rules and the topic list, which the code owns so a prompt author cannot break topic injection or
 * tool use. Topics are sorted by key
 * so the same topics always give the same text. Only `topicKey` and `description` are taken from a
 * topic. Fails instead of cutting the list, because a topic Claude cannot
 * see is a topic it cannot match.
 */
export function buildAskAwaySystemPrompt({
  template,
  topics,
  details,
}: {
  template: string;
  topics: TopicCandidate[];
  /** The live documents. They only contribute which topics are combined, never their text. */
  details: TaggedDocument[];
}): AskAwaySystemPrompt {
  const sortedTopics = [...topics].sort((a, b) => a.topicKey.localeCompare(b.topicKey));
  const partnersByTopic = findCombinationPartners({ details });
  const topicList =
    sortedTopics.length === 0
      ? "(No topics have been set up yet.)"
      : sortedTopics
          .map((topic) => describeTopic({ topic, partners: partnersByTopic.get(topic.topicKey) ?? [] }))
          .join("\n");
  const instructions = renderPromptTemplate({ template, values: { markTopicsToolName: MARK_TOPICS_TOOL_NAME } });
  const system = `${instructions}\n\n${TOOL_RULES}\n\nTopics:\n${topicList}`;

  if (system.length > MAX_SYSTEM_CHARS) {
    return {
      ok: false,
      message: `The prompt and topic list are too long to send (${system.length.toLocaleString("en-US")} characters, the limit is ${MAX_SYSTEM_CHARS.toLocaleString("en-US")}). Shorten the prompt in the knowledge base settings or shorten topic descriptions.`,
    };
  }
  return { ok: true, system };
}
