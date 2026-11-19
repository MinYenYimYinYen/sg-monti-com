import { useKnowledgeBaseSettings } from "@/app/knowledgeBase/knowledgeBaseSettings/useKnowledgeBaseSettings";
import { useTopics } from "@/app/knowledgeBase/topic/useTopics";
import { useTopicDetails } from "@/app/knowledgeBase/topicDetail/useTopicDetails";

/**
 * Loads everything the knowledge base editor shows. Called once, from the editor's layout. The settings
 * are here because the approver list decides what every document's approval panel shows.
 */
export function useKnowledgeBaseDeps() {
  useTopics();
  useTopicDetails();
  useKnowledgeBaseSettings();
}
