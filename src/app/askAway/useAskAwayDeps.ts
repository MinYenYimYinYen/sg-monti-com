import { useKnowledgeBaseSettings } from "@/app/knowledgeBase/knowledgeBaseSettings/useKnowledgeBaseSettings";
import { useTopics } from "@/app/knowledgeBase/topic/useTopics";
import { useTopicDetails } from "@/app/knowledgeBase/topicDetail/useTopicDetails";

/**
 * Loads the topics, documents and settings (the prompt) the conversation draws on. Called once, from
 * the workspace, which sits behind the capability gates, so the loads only run for a user who holds the reads.
 */
export function useAskAwayDeps() {
  useTopics();
  useTopicDetails();
  useKnowledgeBaseSettings();
}
