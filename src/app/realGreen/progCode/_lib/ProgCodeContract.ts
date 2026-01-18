import { ArrayResponse } from "@/lib/api/types/responses";
import { ProgCode } from "@/app/realGreen/progCode/_lib/ProgCode";

export interface ProgCodeContract {
  getAll: {
    params: {};
    result: ArrayResponse<ProgCode>;
  };
}
