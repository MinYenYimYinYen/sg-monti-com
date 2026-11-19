import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { topicDetailActions } from "@/app/knowledgeBase/topicDetail/topicDetailSlice";

/**
 * Loads every version of one document, for when someone is looking back. Nothing loads while
 * `detailKey` is null. The history is dropped whenever the document changes, so opening it again
 * after an approval fetches the new state. Components read it with `topicDetailSelect.historyByDetailKey`.
 */
export function useTopicDetailHistory(detailKey: string | null) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (detailKey === null) return;
    dispatch(
      topicDetailActions.getTopicDetailVersionHistory({
        params: { detailKey },
        config: { loadingMsg: "Loading versions...", force: true },
      }),
    );
  }, [dispatch, detailKey]);
}
