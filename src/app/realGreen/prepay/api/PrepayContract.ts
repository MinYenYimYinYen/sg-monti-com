import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { PrepayDoc } from "@/app/realGreen/prepay/PrepayTypes";

export interface PrepayContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<PrepayDoc[]>;
  };
}
