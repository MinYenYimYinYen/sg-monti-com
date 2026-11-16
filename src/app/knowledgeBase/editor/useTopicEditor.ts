import { useAppDispatch } from "@/lib/hooks/redux";
import type { TopicDoc } from "@/app/knowledgeBase/topic/TopicTypes";
import type { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";
import { topicActions } from "@/app/knowledgeBase/topic/topicSlice";
import { topicDetailActions } from "@/app/knowledgeBase/topicDetail/topicDetailSlice";
import { topicEditorActions } from "@/app/knowledgeBase/editor/topicEditorSlice";
import type { TopicDetailDraft, TopicDraft } from "@/app/knowledgeBase/editor/topicEditorTypes";
import {
  detailDraftToUpsertParams,
  makeBlankDetailDraft,
  makeBlankTopicDraft,
  makeDetailDraftFromDoc,
  makeTopicDraftFromDoc,
  topicDraftToUpsertParams,
} from "@/app/knowledgeBase/editor/topicEditorLogic";

/** Actions for the topic and document editors. Components read the drafts with selectors. */
export function useTopicEditor() {
  const dispatch = useAppDispatch();

  const startNewTopic = () => dispatch(topicEditorActions.setTopicDraft(makeBlankTopicDraft()));

  const openTopic = (topic: TopicDoc) => dispatch(topicEditorActions.setTopicDraft(makeTopicDraftFromDoc(topic)));

  const editTopic = (changes: Partial<TopicDraft>) => dispatch(topicEditorActions.updateTopicDraft(changes));

  const saveTopic = (draft: TopicDraft) =>
    dispatch(
      topicActions.upsertTopic({
        params: topicDraftToUpsertParams(draft),
        config: { loadingMsg: "Saving topic...", force: true },
      }),
    );

  const deleteTopic = (topicKey: string) =>
    dispatch(
      topicActions.removeTopic({
        params: { topicKey },
        config: { loadingMsg: "Deleting topic...", force: true },
      }),
    );

  const startNewTopicDetail = () => dispatch(topicEditorActions.setDetailDraft(makeBlankDetailDraft()));

  const openTopicDetail = (detail: TopicDetailDoc) =>
    dispatch(topicEditorActions.setDetailDraft(makeDetailDraftFromDoc(detail)));

  const editTopicDetail = (changes: Partial<TopicDetailDraft>) =>
    dispatch(topicEditorActions.updateDetailDraft(changes));

  const saveTopicDetail = (draft: TopicDetailDraft) =>
    dispatch(
      topicDetailActions.upsertTopicDetail({
        params: detailDraftToUpsertParams(draft),
        config: { loadingMsg: "Saving document...", force: true },
      }),
    );

  const deleteTopicDetail = (detailKey: string) =>
    dispatch(
      topicDetailActions.removeTopicDetail({
        params: { detailKey },
        config: { loadingMsg: "Deleting document...", force: true },
      }),
    );

  return {
    startNewTopic,
    openTopic,
    editTopic,
    saveTopic,
    deleteTopic,
    startNewTopicDetail,
    openTopicDetail,
    editTopicDetail,
    saveTopicDetail,
    deleteTopicDetail,
  };
}
