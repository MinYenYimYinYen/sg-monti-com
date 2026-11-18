import { useTopics } from "@/app/knowledgeBase/topic/useTopics";
import { useTopicDetails } from "@/app/knowledgeBase/topicDetail/useTopicDetails";

/**
 * Loads the topics and documents the conversation draws on. Called once, from the workspace, which
 * sits behind the capability gate, so the loads only run for a user who holds the read.
 */
export function useAskAwayDeps() {
  useTopics();
  useTopicDetails();
}
