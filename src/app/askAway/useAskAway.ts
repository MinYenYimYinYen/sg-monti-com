import { useAppDispatch } from "@/lib/hooks/redux";
import { askAwayActions } from "@/app/askAway/askAwaySlice";
import { sendAskAwayPrompt } from "@/app/askAway/askAwayThunks";

/** The actions only. Components select the conversation directly with `askAwaySelect`. */
export function useAskAway() {
  const dispatch = useAppDispatch();

  function sendPrompt(text: string) {
    void dispatch(sendAskAwayPrompt({ text }));
  }

  function clearConversation() {
    dispatch(askAwayActions.conversationCleared());
  }

  return { sendPrompt, clearConversation };
}
