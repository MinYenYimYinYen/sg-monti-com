import { useTopics } from "@/app/knowledgeBase/topic/useTopics";
import { useTopicDetails } from "@/app/knowledgeBase/topicDetail/useTopicDetails";

/** Loads everything the knowledge base editor shows. Called once, from the editor's layout. */
export function useKnowledgeBaseDeps() {
  useTopics();
  useTopicDetails();
}
