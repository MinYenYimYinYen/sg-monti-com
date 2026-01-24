import { DataResponse } from "@/lib/api/types/responses";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { ZipCodeDoc } from "../_lib/ZipCodeTypes";

export interface ZipCodeContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<ZipCodeDoc[]>;
  };
}
