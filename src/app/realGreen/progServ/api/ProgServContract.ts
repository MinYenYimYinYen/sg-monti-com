import { ProgServ } from "@/app/realGreen/progServ/_lib/types/ProgServ";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse, SuccessResponse } from "@/lib/api/types/responses";
import { ProgCodeDoc } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { ServCodeDoc } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { UnsavedServCodeChanges } from "@/app/realGreen/progServ/_lib/types/ProgServState";

export interface ProgServContract extends ApiContract {
  getProgCodes: {
    params: {};
    result: DataResponse<{
      progCodeDocs: ProgCodeDoc[];
      progServs: ProgServ[];
    }>;
  };
  getServCodes: {
    params: {};
    result: DataResponse<ServCodeDoc[]>;
  };
  saveServCodeChanges: {
    params: { unsavedChanges: UnsavedServCodeChanges[] };
    result: DataResponse<boolean>;
  };
}
