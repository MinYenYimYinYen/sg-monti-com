import { ArrayResponse } from "@/lib/api/types/responses";
import { Flag } from "@/app/realGreen/flag/Flag";

export interface FlagContract {
  getAll: {
    params: {};
    result: ArrayResponse<Flag>;
  };
}
