import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import {
  SaveDecisionsParams,
  SaveDecisionsResult,
} from "@/app/qbo/importCCTxn/types/ImportDecisionTypes";

export interface ImportDecisionContract extends ApiContract {
  // Saves everything decided on the Map tab in one request. Writes only our own data, never
  // QuickBooks. A part that is refused comes back in `failures`; the rest is still saved.
  saveDecisions: {
    params: SaveDecisionsParams;
    result: DataResponse<SaveDecisionsResult>;
  };
}
