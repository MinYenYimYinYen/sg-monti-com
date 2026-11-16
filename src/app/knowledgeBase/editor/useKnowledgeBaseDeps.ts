import { useTopics } from "@/app/knowledgeBase/topic/useTopics";
import { useTopicDetails } from "@/app/knowledgeBase/topicDetail/useTopicDetails";

/**
 * Loads everything the knowledge base editor shows. Called once, from the editor's layout.
 * `canLoad` comes from the layout (`allows(can.knowledgeTopics.read)`), because hooks do not select.
 */
export function useKnowledgeBaseDeps({ canLoad }: { canLoad: boolean }) {
  useTopics({ canLoad });
  useTopicDetails({ canLoad });
}
