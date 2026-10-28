import type { ApiContract } from "@/lib/api/types/ApiContract";
import type { DataResponse } from "@/lib/api/types/responses";
import type { FormTemplateDoc } from "./FormTemplateTypes";

export interface FormTemplateContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<FormTemplateDoc[]>;
  };
  upsert: {
    params: { template: FormTemplateDoc };
    result: DataResponse<FormTemplateDoc>;
  };
  deleteOne: {
    params: { templateId: string };
    result: DataResponse<FormTemplateDoc>;
  };
}
