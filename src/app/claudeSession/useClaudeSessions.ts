import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { claudeSessionActions } from "@/app/claudeSession/claudeSessionSlice";
import { CLAUDE_SESSION_STALE_MS } from "@/app/claudeSession/claudeSessionConst";
import type { AppendTurnParams } from "@/app/claudeSession/ClaudeSessionTypes";

/**
 * Loads the saved session list and exposes the actions that change it. `canLoad` comes from the
 * component, because hooks expose actions only and do not select. Absent means allowed.
 */
export function useClaudeSessions({ canLoad = true }: { canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!canLoad) return;
    dispatch(
      claudeSessionActions.getSessions({
        params: {},
        config: { loadingMsg: "Loading conversations...", staleTime: CLAUDE_SESSION_STALE_MS },
      }),
    );
  }, [canLoad, dispatch]);

  // Recalling a conversation. A session already held in state is not fetched again.
  function loadTurns(sessionId: string) {
    dispatch(
      claudeSessionActions.getTurns({
        params: { sessionId },
        config: { loadingMsg: "Loading conversation..." },
      }),
    );
  }

  // Saving is background work, so it does not block the chat with a spinner.
  function appendTurn(params: AppendTurnParams) {
    dispatch(claudeSessionActions.appendTurn({ params, config: { showLoading: false } }));
  }

  function removeSession(sessionId: string) {
    dispatch(
      claudeSessionActions.removeSession({
        params: { sessionId },
        config: { loadingMsg: "Deleting conversation...", successMsg: "Conversation deleted." },
      }),
    );
  }

  return { loadTurns, appendTurn, removeSession };
}
