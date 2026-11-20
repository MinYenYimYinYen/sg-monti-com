import type { TopicDoc } from "@/app/knowledgeBase/topic/TopicTypes";
import type { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";
import { compareBySpecificity } from "@/app/knowledgeBase/topicDetail/topicDetailLogic";
import { deriveApprovalProps } from "@/app/knowledgeBase/topicDetail/topicDetailApprovalLogic";
import type {
  ReviewableTopicDetail,
  Topic,
  TopicDetail,
  TopicDocumentSummary,
} from "@/app/knowledgeBase/editor/knowledgeBaseTypes";

/**
 * Adds each head's approval state: who has approved, who is still pending, and which version the AI
 * reads, which is a different row from the head whenever the head is waiting for approval.
 */
export function attachApprovalToDetails({
  details,
  liveDocs,
  approverUserNames,
}: {
  details: TopicDetail[];
  liveDocs: TopicDetailDoc[];
  approverUserNames: string[];
}): ReviewableTopicDetail[] {
  const liveByDetailKey = new Map(liveDocs.map((doc) => [doc.detailKey, doc]));
  return details.map((detail) => ({
    ...detail,
    ...deriveApprovalProps({ head: detail, live: liveByDetailKey.get(detail.detailKey) ?? null, approverUserNames }),
  }));
}

/** Each topic, ordered by name, with the documents tagged with it. A topic with no documents gets an empty list. */
export function attachDocumentsToTopics({
  topics,
  details,
}: {
  topics: TopicDoc[];
  details: TopicDetailDoc[];
}): Topic[] {
  const documentsByTopicKey = new Map<string, TopicDocumentSummary[]>();
  for (const detail of [...details].sort(compareBySpecificity)) {
    const summary = { detailKey: detail.detailKey, title: detail.title, topicKeys: detail.topicKeys };
    for (const topicKey of detail.topicKeys) {
      const documents = documentsByTopicKey.get(topicKey) ?? [];
      documents.push(summary);
      documentsByTopicKey.set(topicKey, documents);
    }
  }
  return [...topics]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((topic) => ({ ...topic, documents: documentsByTopicKey.get(topic.topicKey) ?? [] }));
}

/**
 * Splits topics into those with documents and those without, each group alphabetical by name, and puts
 * the covered group first. The uncovered topics are the authoring to-do list, so they sit together at
 * the bottom instead of being scattered through the alphabet.
 */
export function orderTopicsByCoverage(topics: Topic[]): Topic[] {
  const byName = (a: Topic, b: Topic) => a.name.localeCompare(b.name);
  const withDocuments = topics.filter((topic) => topic.documents.length > 0).sort(byName);
  const withoutDocuments = topics.filter((topic) => topic.documents.length === 0).sort(byName);
  return [...withDocuments, ...withoutDocuments];
}

/** Each document with its topics resolved, so the UI never looks a topic up by key. */
export function attachTopicsToDetails({
  topics,
  details,
}: {
  topics: TopicDoc[];
  details: TopicDetailDoc[];
}): TopicDetail[] {
  const topicsByKey = new Map(topics.map((topic) => [topic.topicKey, topic]));
  return [...details].sort(compareBySpecificity).map((detail) => {
    const found: TopicDoc[] = [];
    const missingTopicKeys: string[] = [];
    for (const topicKey of detail.topicKeys) {
      const topic = topicsByKey.get(topicKey);
      if (topic) found.push(topic);
      else missingTopicKeys.push(topicKey);
    }
    return { ...detail, topics: found, missingTopicKeys };
  });
}
