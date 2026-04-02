import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { TreeNodeDoc } from "@/app/quickSend/templates/TemplateTypes";

export interface TemplateContract extends ApiContract {
  getTreeNodes: {
    params: Record<string, never>;
    result: DataResponse<TreeNodeDoc[]>;
  };
}
