import { ProgServ } from "@/app/realGreen/progServ/ProgServ";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { ArrayResponse } from "@/lib/api/types/responses";

export interface ProgServMetaContract extends ApiContract {
  sync: {
    params: {
      progDefIds: number[];
    };
    result: ArrayResponse<ProgServ>;
  };
}
