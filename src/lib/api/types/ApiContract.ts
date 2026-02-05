import { SuccessResponse } from "@/lib/api/types/responses";

export interface ApiContract<TParams = any> {
  [key: string]: {
    params: TParams;
    result: SuccessResponse;
  };
}