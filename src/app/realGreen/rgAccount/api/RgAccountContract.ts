import { DataResponse } from "@/lib/api/types/responses";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { RgAccountCore } from "@/app/realGreen/rgAccount/RgAccountTypes";

export interface RgAccountContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<RgAccountCore[]>;
  };
}
