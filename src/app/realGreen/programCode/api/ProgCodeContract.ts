import { ArrayResponse } from "@/lib/api/types/responses";
import { ProgCode } from "@/app/realGreen/programCode/ProgCode";

export interface ProgCodeContract {
  getAll: {
    params: {};
    result: ArrayResponse<ProgCode>;
  };
}
