import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse, SuccessResponse } from "@/lib/api/types/responses";
import { TreeNodeDoc } from "@/app/quickSend_bad/templates/TemplateTypes";

export interface TemplateContract extends ApiContract {
  getTreeNodes: {
    params: Record<string, never>;
    result: DataResponse<TreeNodeDoc[]>;
  };
  createNode: {
    params: { node: TreeNodeDoc };
    result: DataResponse<TreeNodeDoc>;
  };
  updateNode: {
    params: { node: TreeNodeDoc };
    result: DataResponse<TreeNodeDoc>;
  };
  deleteNode: {
    params: { nodeId: string };
    result: SuccessResponse;
  };
}
