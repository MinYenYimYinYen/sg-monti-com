import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";

export interface TopicDetailContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<TopicDetailDoc[]>;
  };
  /** The server normalizes `topicKeys` and derives `detailKey`. Different tags mean a different document. */
  upsert: {
    params: Pick<TopicDetailDoc, "topicKeys" | "title" | "contentHtml">;
    result: DataResponse<TopicDetailDoc>;
  };
  remove: {
    params: { detailKey: string };
    result: DataResponse<boolean>;
  };
}
