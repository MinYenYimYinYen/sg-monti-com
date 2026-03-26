import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { EquipmentDoc } from "@/app/equipment/EquipmentTypes";

export interface EquipmentContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<EquipmentDoc[]>;
  };
  upsert: {
    params: { equipment: EquipmentDoc };
    result: DataResponse<EquipmentDoc>;
  };
  deleteOne: {
    params: { equipment: EquipmentDoc; clearReferences?: boolean };
    result: DataResponse<EquipmentDoc>;
  };
  checkDependencies: {
    params: { equipmentId: string };
    result: DataResponse<{ packageIds: string[] }>;
  };
}
