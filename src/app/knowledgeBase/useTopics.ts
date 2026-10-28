import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { topicActions } from "@/app/knowledgeBase/topicSlice";

export function useTopics() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      topicActions.getAllTopics({
        params: {},
        config: { loadingMsg: "Loading topics..." },
      }),
    );
  }, [dispatch]);
}
