import { ArrayResponse } from "@/lib/api/types/responses";
import { ProgCode } from "@/app/realGreen/progCode/_lib/ProgCode";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface ProgCodeContract extends ApiContract {
  getAll: {
    params: {};
    result: ArrayResponse<ProgCode>;
  };
}
