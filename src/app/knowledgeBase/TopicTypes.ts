import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

/**
 * A call topic with the guidance a CSR sees while on a call. The classifier is
 * only given `topicKey` and `description` and picks a key; it never writes
 * guidance, which always comes from this document.
 */
export type TopicDoc = CreatedUpdated & {
  topicKey: string;
  name: string;
  /** When this topic applies. This is the text the classifier reads. */
  description: string;
  /** Phrases or situations that hint at this topic */
  signals?: string[];
  guidance: string;
  /** Things the CSR should not say or promise on this topic */
  avoid?: string[];
};
