import { ProgServ } from "@/app/realGreen/progServ/_lib/types/ProgServ";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { ProgCodeWithMongo } from "@/app/realGreen/progServ/_lib/types/ProgCode";
import { ServCodeWithMongo } from "@/app/realGreen/progServ/_lib/types/ServCode";

export interface ProgServContract extends ApiContract {
  syncProgServ: {
    params: { progDefIds: number[] };
    result: DataResponse<ProgServ[]>;
  };
  getProgCodes: {
    params: {};
    result: DataResponse<ProgCodeWithMongo[]>;
  };
  getServCodes: {
    params: {};
    result: DataResponse<ServCodeWithMongo[]>;
  };
}
