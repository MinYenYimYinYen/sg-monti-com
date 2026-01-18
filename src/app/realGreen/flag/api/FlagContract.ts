import { ArrayResponse } from "@/lib/api/types/responses";
import { Flag } from "@/app/realGreen/flag/Flag";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface FlagContract extends ApiContract {
  getAll: {
    params: {};
    result: ArrayResponse<Flag>;
  };
}
