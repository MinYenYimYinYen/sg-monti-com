import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { topicDetailActions } from "@/app/knowledgeBase/topicDetail/topicDetailSlice";
import { KNOWLEDGE_BASE_STALE_MS } from "@/app/knowledgeBase/knowledgeBaseConst";

export function useTopicDetails() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      topicDetailActions.getAllTopicDetails({
        params: {},
        config: { loadingMsg: "Loading topic documents...", staleTime: KNOWLEDGE_BASE_STALE_MS },
      }),
    );
  }, [dispatch]);
}
