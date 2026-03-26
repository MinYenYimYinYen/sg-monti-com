import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { AppMethodDoc } from "@/app/appMethod/AppMethodTypes";


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
    params: {appMethod: AppMethodDoc; clearReferences?: boolean};
    result: DataResponse<AppMethodDoc>;
  }
  checkDependencies: {
    params: {appMethodId: string};
    result: DataResponse<{productIds: number[]}>;
  }

}