import { z } from "zod";
import type { AppDispatch, AppState } from "@/store";
import { findToolUses } from "@/app/anthropic/anthropicLogic";
import type { ChatTurn } from "@/app/anthropic/AnthropicTypes";
import { MARK_TOPICS_TOOL_NAME } from "@/app/askAway/askAwayConst";
import { askAwaySelect } from "@/app/askAway/askAwaySelect";
import { askAwayActions } from "@/app/askAway/askAwaySlice";
import { topicSelect } from "@/app/knowledgeBase/topic/topicSelect";
import { resolveDetails } from "@/app/knowledgeBase/topicDetail/topicDetailLogic";
import { topicDetailSelect } from "@/app/knowledgeBase/topicDetail/topicDetailSelect";
import { htmlToMarkdown } from "@/lib/primatives/string/htmlToMarkdown";

type TagSetKeyed = { detailKey: string; topicKeys: string[] };

export type TopicMarkingPlan<T extends TagSetKeyed> = {
  /** Requested keys that are real topics. */
  validTopicKeys: string[];
  unknownTopicKeys: string[];
  alreadyMarkedTopicKeys: string[];
  newlyMarkedTopicKeys: string[];
  /** Documents that become applicable only because of this call, general to specific. */
  newDetails: T[];
};

export type ClaudeDocument = { title: string; topicKeys: string[]; markdown: string };

/**
 * Reads the topic keys back out of a saved `tool_use` input. Lenient on purpose, unlike the tool's own
 * schema: the input was already checked when the tool ran, and a conversation saved under an older
 * schema must still load.
 */
const savedMarkTopicsInputSchema = z.object({ topicKeys: z.array(z.string()) });

/** Trims, drops blanks and deduplicates, keeping the order Claude gave. */
export function cleanTopicKeys(topicKeys: string[]): string[] {
  const trimmed = topicKeys.map((topicKey) => topicKey.trim()).filter((topicKey) => topicKey.length > 0);
  return [...new Set(trimmed)];
}

/**
 * Works out what marking topics changes. A document applies when all of its tags are marked
 * (`resolveDetails`), so a call can bring in documents tagged with a mix of old and new topics.
 * Only the documents that were not applicable before are returned, so Claude is never sent a
 * document it already holds.
 */
export function planTopicMarking<T extends TagSetKeyed>({
  requestedTopicKeys,
  knownTopicKeys,
  currentTopicKeys,
  details,
}: {
  requestedTopicKeys: string[];
  knownTopicKeys: string[];
  currentTopicKeys: string[];
  details: T[];
}): TopicMarkingPlan<T> {
  const known = new Set(knownTopicKeys);
  const current = new Set(currentTopicKeys);
  const requested = cleanTopicKeys(requestedTopicKeys);

  const validTopicKeys = requested.filter((topicKey) => known.has(topicKey));
  const unknownTopicKeys = requested.filter((topicKey) => !known.has(topicKey));
  const alreadyMarkedTopicKeys = validTopicKeys.filter((topicKey) => current.has(topicKey));
  const newlyMarkedTopicKeys = validTopicKeys.filter((topicKey) => !current.has(topicKey));

  const applicableBefore = new Set(
    resolveDetails({ matchedTopicKeys: currentTopicKeys, details }).map((detail) => detail.detailKey),
  );
  const newDetails = resolveDetails({
    matchedTopicKeys: [...currentTopicKeys, ...newlyMarkedTopicKeys],
    details,
  }).filter((detail) => !applicableBefore.has(detail.detailKey));

  return { validTopicKeys, unknownTopicKeys, alreadyMarkedTopicKeys, newlyMarkedTopicKeys, newDetails };
}

/** One document as Claude reads it: a heading, the topics it applies to, then the body. */
export function formatDocumentForClaude({ title, topicKeys, markdown }: ClaudeDocument): string {
  return `## ${title}\nTopics: ${topicKeys.join(", ")}\n\n${markdown}`;
}

/** What the tool returns to Claude. Each part is only said when it applies. */
export function buildMarkTopicsOutput({
  plan,
  documents,
}: {
  plan: Pick<TopicMarkingPlan<TagSetKeyed>, "unknownTopicKeys" | "alreadyMarkedTopicKeys" | "newlyMarkedTopicKeys">;
  documents: ClaudeDocument[];
}): string {
  const lines: string[] = [];
  if (plan.newlyMarkedTopicKeys.length > 0) {
    lines.push(`Marked as relevant: ${plan.newlyMarkedTopicKeys.join(", ")}.`);
  }
  if (plan.alreadyMarkedTopicKeys.length > 0) {
    lines.push(`Already loaded earlier in this conversation: ${plan.alreadyMarkedTopicKeys.join(", ")}.`);
  }
  if (plan.unknownTopicKeys.length > 0) {
    lines.push(`Not in the topic list, ignored: ${plan.unknownTopicKeys.join(", ")}.`);
  }

  if (documents.length === 0) {
    lines.push("No new documents apply. Either the topics have no documents yet, or you already have them.");
    return lines.join("\n");
  }
  lines.push(
    "",
    "Documents, general to specific. Where two conflict, the later one is more specific and wins.",
    "The user already sees these documents on screen. Do not repeat them; use them to relate to the conversation.",
    "",
    documents.map(formatDocumentForClaude).join("\n\n---\n\n"),
  );
  return lines.join("\n");
}

/**
 * The topics marked so far, read back from the conversation itself: every `markTopicsRelevant` call
 * whose result was not an error. This is what keeps the topic state honest. A turn that failed part
 * way is trimmed out of the history, and the topics it marked must go with it, or the documents panel
 * would show documents Claude never received and the tool would later refuse to send them. It also
 * restores a conversation recalled from storage, with no extra stored field.
 */
export function collectMarkedTopicKeys({
  turns,
  knownTopicKeys,
}: {
  turns: ChatTurn[];
  knownTopicKeys: string[];
}): string[] {
  const known = new Set(knownTopicKeys);
  const markedTopicKeys: string[] = [];

  for (const turn of turns) {
    const failedToolUseIds = new Set<string>();
    for (const reply of turn.replies) {
      for (const block of reply.content) {
        if (block.type === "tool_result" && block.is_error) failedToolUseIds.add(block.tool_use_id);
      }
    }

    for (const reply of turn.replies) {
      if (reply.role !== "assistant") continue;
      for (const toolUse of findToolUses(reply.content)) {
        if (toolUse.name !== MARK_TOPICS_TOOL_NAME || failedToolUseIds.has(toolUse.id)) continue;
        const parsed = savedMarkTopicsInputSchema.safeParse(toolUse.input);
        if (!parsed.success) continue;
        for (const topicKey of cleanTopicKeys(parsed.data.topicKeys)) {
          if (known.has(topicKey) && !markedTopicKeys.includes(topicKey)) markedTopicKeys.push(topicKey);
        }
      }
    }
  }
  return markedTopicKeys;
}

/**
 * Runs `markTopicsRelevant`. Reads the store when called, not when the tool was built, because the
 * marked topics change between model calls. Synchronous on purpose: see the tool definition.
 */
export function markTopics({
  topicKeys,
  dispatch,
  getState,
}: {
  topicKeys: string[];
  dispatch: AppDispatch;
  getState: () => AppState;
}): string {
  const state = getState();
  const plan = planTopicMarking({
    requestedTopicKeys: topicKeys,
    knownTopicKeys: topicSelect.docs(state).map((topic) => topic.topicKey),
    currentTopicKeys: askAwaySelect.currentTopicKeys(state),
    // Live versions only, so a draft or an edit nobody has approved is never sent to Claude.
    details: topicDetailSelect.liveDocs(state),
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
}
