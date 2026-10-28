import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { TopicDoc } from "@/app/knowledgeBase/TopicTypes";

export interface TopicContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<TopicDoc[]>;
  };
  upsert: {
    params: Omit<TopicDoc, "createdAt" | "updatedAt">;
    result: DataResponse<TopicDoc>;
  };
  remove: {
    params: { topicKey: string };
    result: DataResponse<boolean>;
  };
}
