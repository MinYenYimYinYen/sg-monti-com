import { ArrayResponse } from "@/lib/api/types/responses";
import { ZipCode } from "@/app/realGreen/zipCode/ZipCode";

export interface ZipCodeContract {
  getAll: {
    params: {};
    result: ArrayResponse<ZipCode>;
  };
}
