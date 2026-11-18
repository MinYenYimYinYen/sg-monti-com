import { MAX_SYSTEM_CHARS } from "@/app/anthropic/anthropicConst";
import { MARK_TOPICS_TOOL_NAME } from "@/app/askAway/askAwayConst";
import type { TopicDoc } from "@/app/knowledgeBase/topic/TopicTypes";

export type TopicCandidate = Pick<TopicDoc, "topicKey" | "description">;

export type AskAwaySystemPrompt = { ok: true; system: string } | { ok: false; message: string };

// The three labels are part of the contract with the person reading the chat, so they are named once
// here and the instructions below are built from them.
export const REPLY_SECTION_LABELS = { matched: "Matched", relevant: "Relevant", notCovered: "Not covered" } as const;

const { matched, relevant, notCovered } = REPLY_SECTION_LABELS;

const INSTRUCTIONS = `You help the staff of a lawn care company during customer calls, using only the company's own documents.

The documents for the topics you mark appear on the user's screen as soon as you mark them. Never repeat or summarize a document. Your job is to connect the documents to this conversation.

How you work:
1. Read the user's message and decide which of the topics listed below it is about. It can match several topics, or none.  Take the topic's description into account as well.
2. Call ${MARK_TOPICS_TOOL_NAME} with the topicKey of every matching topic. Use only keys from the list. Topics already marked stay loaded, so do not mark them again. Call the tool again whenever the conversation moves onto a topic you have not marked yet.
3. Reply in this form, and include a part only when it applies:
   ${matched}: one line per topic you marked this turn, as "topicKey: why the conversation fits that topic's description".
   ${relevant}: one bullet per point where a document says something that bears on what was said in this conversation. Name the document, tie the point to the specific thing the user said, and give figures and rules exactly. Skip anything that does not bear on the conversation.
   ${notCovered}: one line saying what the user is asking about that the documents say nothing about.
4. Use only what the documents say. Never fill gaps with general knowledge, and never guess company policy, prices, procedures, or what a person recommended. When two documents disagree, the later one is more specific and wins.
5. Use the whole conversation, not just the last message, and do not repeat a point you made earlier.
6. Your reply is shown as rendered markdown, where a single line break does not start a new line. Write every line of a part as its own "- " bullet, bold the part labels and the document names with **, and put a blank line between the parts. Do not use headings, tables or code blocks.`;

/** One line per topic: the key Claude must send back, and the description it decides from. */
function describeTopic(topic: TopicCandidate): string {
  const description = topic.description.replace(/\s+/g, " ").trim();
  return `- ${topic.topicKey}: ${description}`;
}

/**
 * The system prompt for every turn. Topics are sorted by key so the same topics always give the
 * same text. Only `topicKey` and `description` are taken, so a topic's signals never reach Claude.
 * Fails instead of cutting the list, because a topic Claude cannot see is a topic it cannot match.
 */
export function buildAskAwaySystemPrompt(topics: TopicCandidate[]): AskAwaySystemPrompt {
  const sortedTopics = [...topics].sort((a, b) => a.topicKey.localeCompare(b.topicKey));
  const topicList =
    sortedTopics.length === 0 ? "(No topics have been set up yet.)" : sortedTopics.map(describeTopic).join("\n");
  const system = `${INSTRUCTIONS}\n\nTopics:\n${topicList}`;

  if (system.length > MAX_SYSTEM_CHARS) {
    return {
      ok: false,
      message: `The topic list is too long to send (${system.length.toLocaleString("en-US")} characters, the limit is ${MAX_SYSTEM_CHARS.toLocaleString("en-US")}). Shorten topic descriptions or raise MAX_SYSTEM_CHARS.`,
    };
  }
  return { ok: true, system };
}
