import { SuccessResponse } from "@/lib/api/types/responses";

export interface ApiContract<TParams = any> {
  [key: string]: {
    params: TParams;
    result: SuccessResponse;
  };
}

//todo: Standardize all the Contracts in the project to extend ApiContract
// Add this to api.readme.md