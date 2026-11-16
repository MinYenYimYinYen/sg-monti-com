import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

/**
 * A knowledge base document, identified by the set of topics it applies to.
 * `[sales]` is the sales overview, `[aeration]` says what aeration is, and
 * `[aeration, sales]` is how to sell aeration specifically. A consumer loads every
 * document whose `topicKeys` are all among the matched topics, general to specific.
 *
 * No person is recorded on this document, so deleting a user never touches it.
 */
export type TopicDetailDoc = CreatedUpdated & {
  /** Derived by the server from `topicKeys` (for example `aeration+sales`). Clients never send it. */
  detailKey: string;
  /** Sorted, deduplicated and non-empty. Every key is an existing `Topic.topicKey`. */
  topicKeys: string[];
  title: string;
  /** TipTap HTML. The only content field; consumers convert it to what they need. */
  contentHtml: string;
};
