import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import {
  AppMethodDoc,
} from "@/app/realGreen/product/appMethod/AppMethodTypes";

export interface AppMethodContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<AppMethodDoc[]>; 
  }
  upsert: {
    params: {appMethod: AppMethodDoc};
    result: DataResponse<AppMethodDoc>;
  }
  deleteOne: {
    params: {appMethod: AppMethodDoc};
    result: DataResponse<AppMethodDoc>;
  }

}