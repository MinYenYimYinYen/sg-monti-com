import { DataResponse } from "@/lib/api/types/responses";
import { ZipCode } from "@/app/realGreen/zipCode/ZipCode";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface ZipCodeContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<ZipCode[]>;
  };
}
