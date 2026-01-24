import { ProgServ } from "@/app/realGreen/progServ/_lib/types/ProgServ";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { ProgCodeDoc } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { ServCodeDoc } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

export interface ProgServContract extends ApiContract {
  syncProgServ: {
    params: { progDefIds: number[] };
    result: DataResponse<ProgServ[]>;
  };
  getProgCodes: {
    params: {};
    result: DataResponse<ProgCodeDoc[]>;
  };
  getServCodes: {
    params: {};
    result: DataResponse<ServCodeDoc[]>;
  };
}
