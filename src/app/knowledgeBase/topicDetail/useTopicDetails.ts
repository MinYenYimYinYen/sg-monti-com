import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { topicDetailActions } from "@/app/knowledgeBase/topicDetail/topicDetailSlice";
import { KNOWLEDGE_BASE_STALE_MS } from "@/app/knowledgeBase/knowledgeBaseConst";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select.
 * Absent means allowed.
 */
export function useTopicDetails({ canLoad = true }: { canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!canLoad) return;
    dispatch(
      topicDetailActions.getAllTopicDetails({
        params: {},
        config: { loadingMsg: "Loading topic documents...", staleTime: KNOWLEDGE_BASE_STALE_MS },
      }),
    );
  }, [canLoad, dispatch]);
}
