import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { AppMethodDoc } from "@/app/appMethod/AppMethodTypes";
import { EquipmentDoc } from "@/app/equipment/EquipmentTypes";

export interface AppMethodContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<AppMethodDoc[]>;
  };
  upsert: {
    params: { appMethod: AppMethodDoc };
    result: DataResponse<AppMethodDoc>;
  };
  deleteOne: {
    params: { appMethod: AppMethodDoc; clearReferences?: boolean };
    result: DataResponse<AppMethodDoc>;
  };
  checkDependencies: {
    params: { appMethodId: string };
    result: DataResponse<{
      /** Master product IDs whose equipment packages reference this AppMethod */
      productIds: number[];
      /** Equipment items where this is the default AppMethod — blocking deletion */
      equipmentWithDefault: EquipmentDoc[];
      /** Equipment items where this is in appMethodIds but not the default — non-blocking */
      equipmentInAllowed: EquipmentDoc[];
    }>;
  };
}
