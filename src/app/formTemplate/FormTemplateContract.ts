import type { ApiContract } from "@/lib/api/types/ApiContract";
import type { DataResponse } from "@/lib/api/types/responses";
import type { FormLetterTemplateDoc } from "./FormTemplateTypes";

export interface FormTemplateContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<FormLetterTemplateDoc[]>;
  };
  upsert: {
    params: { template: FormLetterTemplateDoc };
    result: DataResponse<FormLetterTemplateDoc>;
  };
  deleteOne: {
    params: { templateId: string };
    result: DataResponse<FormLetterTemplateDoc>;
  };
}
