import { useAppDispatch } from "@/lib/hooks/redux";
import { knowledgeBaseSettingsActions } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsSlice";
import { topicDetailActions } from "@/app/knowledgeBase/topicDetail/topicDetailSlice";

/** One save action per setting. Components read the settings with `knowledgeBaseSettingsSelect`. */
export function useSaveKnowledgeBaseSettings() {
  const dispatch = useAppDispatch();

  const saveApprovers = async (approverUserNames: string[]) => {
    await dispatch(
      knowledgeBaseSettingsActions.upsertKnowledgeBaseSetting({
        params: { settingKey: "approvers", value: { approverUserNames } },
        config: { loadingMsg: "Saving approvers...", successMsg: "Approvers saved", force: true },
      }),
    );
    // The server may have approved versions that were waiting for someone who was just removed. The
    // documents held here are cached, so they are reloaded to show it.
    dispatch(
      topicDetailActions.getCurrentTopicDetails({ params: {}, config: { force: true, showLoading: false } }),
    );
  };

  const saveAskAwayPrompt = (template: string) =>
    dispatch(
      knowledgeBaseSettingsActions.upsertKnowledgeBaseSetting({
        params: { settingKey: "askAwayPrompt", value: { template } },
        config: { loadingMsg: "Saving prompt...", successMsg: "Prompt saved", force: true },
      }),
    );

  return { saveApprovers, saveAskAwayPrompt };
}
