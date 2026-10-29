import type { ApiContract } from "@/lib/api/types/ApiContract";
import type { DataResponse } from "@/lib/api/types/responses";
import type { FormTemplateDoc } from "./FormTemplateTypes";

export interface FormTemplateContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<FormTemplateDoc[]>;
  };
  /**
   * Create or overwrite the caller's template. `templateId` and `saId` are derived
   * server-side from `templateName` + the caller, so a save can only touch their own.
   */
  upsert: {
    params: { template: FormTemplateDoc };
    result: DataResponse<FormTemplateDoc>;
  };
  /** Delete a template. Only its owner may delete it. */
  deleteOne: {
    params: { templateId: string };
    result: DataResponse<null>;
  };
}
