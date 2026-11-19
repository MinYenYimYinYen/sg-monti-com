import { useAppDispatch } from "@/lib/hooks/redux";
import { topicDetailActions } from "@/app/knowledgeBase/topicDetail/topicDetailSlice";

/** Approve, withdraw and comment. Components read the documents with `topicDetailSelect`. */
export function useTopicDetailReview() {
  const dispatch = useAppDispatch();

  const approve = ({ detailKey, version }: { detailKey: string; version: number }) =>
    dispatch(
      topicDetailActions.approveTopicDetail({
        params: { detailKey, version },
        config: { loadingMsg: "Approving...", force: true },
      }),
    );

  const withdrawApproval = ({ detailKey, version }: { detailKey: string; version: number }) =>
    dispatch(
      topicDetailActions.withdrawTopicDetailApproval({
        params: { detailKey, version },
        config: { loadingMsg: "Withdrawing approval...", force: true },
      }),
    );

  const comment = ({ detailKey, version, text }: { detailKey: string; version: number; text: string }) =>
    dispatch(
      topicDetailActions.commentOnTopicDetail({
        params: { detailKey, version, text },
        config: { loadingMsg: "Saving comment...", force: true },
      }),
    );

  return { approve, withdrawApproval, comment };
}
