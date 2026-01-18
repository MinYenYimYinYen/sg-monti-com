import { ProgServ } from "@/app/realGreen/progServ/ProgServ";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { ArrayResponse } from "@/lib/api/types/responses";
import { ProgCode } from "@/app/realGreen/progCode/_lib/ProgCode";
import { ServCode } from "@/app/realGreen/servCode/ServCode";

export interface ProgServMetaContract extends ApiContract {
  syncProgServ: {
    params: {
      progDefIds: number[];
    };
    result: ArrayResponse<ProgServ>;
  };
  getProgCodes: {
    params: {};
    result: ArrayResponse<ProgCode>;
  };
  getServCodes: {
    params: {};
    result: ArrayResponse<ServCode>;
  };
}
