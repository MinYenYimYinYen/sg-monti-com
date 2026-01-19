import { ArrayResponse } from "@/lib/api/types/responses";
import { ServCode } from "@/app/realGreen/progServMeta/_lib/types/ServCode";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface ServCodeContract extends ApiContract {
  getAll: {
    params: {};
    result: ArrayResponse<ServCode>;
  };
}
