import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { topicActions } from "@/app/knowledgeBase/topicSlice";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select.
 * Absent means allowed.
 */
export function useTopics({ canLoad = true }: { canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!canLoad) return;
    dispatch(
      topicActions.getAllTopics({
        params: {},
        config: { loadingMsg: "Loading topics..." },
      }),
    );
  }, [canLoad, dispatch]);
}
