import { ArrayResponse } from "@/lib/api/types/responses";
import { ServCode } from "@/app/realGreen/servCode/ServCode";

export interface ServCodeContract {
  getAll: {
    params: {};
    result: ArrayResponse<ServCode>;
  };
}
