import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { KNOWLEDGE_BASE_STALE_MS } from "@/app/knowledgeBase/knowledgeBaseConst";
import { knowledgeBaseSettingsActions } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsSlice";

/** Loads the users who could be picked as approvers. Only mount it for someone who can change the list. */
export function useApproverCandidates() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      knowledgeBaseSettingsActions.getApproverCandidates({
        params: {},
        config: { loadingMsg: "Loading users...", staleTime: KNOWLEDGE_BASE_STALE_MS },
      }),
    );
  }, [dispatch]);
}
