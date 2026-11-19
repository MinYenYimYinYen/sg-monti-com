import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { KNOWLEDGE_BASE_STALE_MS } from "@/app/knowledgeBase/knowledgeBaseConst";
import { knowledgeBaseSettingsActions } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsSlice";

/** Loads the settings. Call it from a component that sits behind the `knowledgeSettings.read` gate. */
export function useKnowledgeBaseSettings() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      knowledgeBaseSettingsActions.getAllKnowledgeBaseSettings({
        params: {},
        config: { loadingMsg: "Loading knowledge base settings...", staleTime: KNOWLEDGE_BASE_STALE_MS },
      }),
    );
  }, [dispatch]);
}
