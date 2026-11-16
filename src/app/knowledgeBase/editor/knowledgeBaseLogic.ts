import type { TopicDoc } from "@/app/knowledgeBase/topic/TopicTypes";
import type { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";
import { compareBySpecificity } from "@/app/knowledgeBase/topicDetail/topicDetailLogic";
import type { Topic, TopicDetail, TopicDocumentSummary } from "@/app/knowledgeBase/editor/knowledgeBaseTypes";

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
