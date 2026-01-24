import { DataResponse } from "@/lib/api/types/responses";
import { FlagDoc } from "@/app/realGreen/flag/FlagTypes";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface FlagContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<FlagDoc[]>;
  };
}
