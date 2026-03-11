import { ApiContract } from "@/lib/api/types/ApiContract";
import { SchedPromise } from "../SchedPromiseTypes";
import { DataResponse } from "@/lib/api/types/responses";

export interface SchedPromiseContract extends ApiContract {
  getSchedPromises: {
    params: {
      serviceIds?: number[];
      programIds?: number[];
      customerIds?: number[];
    };
    result: DataResponse<SchedPromise[]>;
  };
}
