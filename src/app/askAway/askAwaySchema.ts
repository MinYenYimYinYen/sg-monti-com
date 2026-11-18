import { z } from "zod";
import { MAX_TOPICS_PER_CALL } from "@/app/askAway/askAwayConst";

/**
 * What Claude sends to `markTopicsRelevant`. It is the tool's JSON schema, the check on Claude's
 * input, and the shape read back out of a saved conversation to see which topics were marked.
 */
export const markTopicsInputSchema = z.object({
  topicKeys: z
    .array(z.string().min(1))
    .min(1)
    .max(MAX_TOPICS_PER_CALL)
    .describe("The topicKey of every topic from the topic list that the user's message is about."),
});
