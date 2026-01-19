import { ProgServ } from "@/app/realGreen/progServMeta/_lib/types/ProgServ";
import {ObjResponse} from "@/lib/api/types/responses";

export interface ProgServContract {
  getOne: {
    params: { progDefId: number };
    result: ObjResponse<ProgServ>;
  };
}
