import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { topicActions } from "@/app/knowledgeBase/topic/topicSlice";
import { KNOWLEDGE_BASE_STALE_MS } from "@/app/knowledgeBase/knowledgeBaseConst";

export function useTopics() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      topicActions.getAllTopics({
        params: {},
        config: { loadingMsg: "Loading topics...", staleTime: KNOWLEDGE_BASE_STALE_MS },
      }),
    );
  }, [dispatch]);
}
