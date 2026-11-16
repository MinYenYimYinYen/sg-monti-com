import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

/**
 * A knowledge base topic: a label for something a call can be about, such as `aeration` or `sales`.
 * A topic holds no guidance text. Guidance lives in `TopicDetailDoc` documents tagged with topics.
 * The classifier is only given `topicKey` and `description` and picks keys.
 */
export type TopicDoc = CreatedUpdated & {
  topicKey: string;
  name: string;
  /** When this topic applies. This is the text the classifier reads. */
  description: string;
  /** Phrases a consumer can match programmatically in a live transcript. Never sent to the classifier. */
  signals?: string[];
};
