import type { TopicDoc } from "@/app/knowledgeBase/topic/TopicTypes";
import type { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";

/** What a topic needs to show about a document tagged with it. The body is left out on purpose. */
export type TopicDocumentSummary = Pick<TopicDetailDoc, "detailKey" | "title" | "topicKeys">;

/** Documents tagged with the topic, general to specific. This is the topic's backlinks. */
export type TopicProps = {
  documents: TopicDocumentSummary[];
};

export type Topic = TopicDoc & TopicProps;

export type TopicDetailProps = {
  /** The topics in `topicKeys`, in the same order. */
  topics: TopicDoc[];
  /** Keys in `topicKeys` with no matching topic. Saving rejects these, so this only shows drift or a delete race. */
  missingTopicKeys: string[];
};

export type TopicDetail = TopicDetailDoc & TopicDetailProps;
