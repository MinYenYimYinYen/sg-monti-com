import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { EquipmentPackageDoc } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";

export interface EquipmentPackageContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<EquipmentPackageDoc[]>;
  };
  upsert: {
    params: { equipmentPackage: EquipmentPackageDoc };
    result: DataResponse<EquipmentPackageDoc>;
  };
  deleteOne: {
    params: { equipmentPackage: EquipmentPackageDoc; clearReferences?: boolean };
    result: DataResponse<EquipmentPackageDoc>;
  };
  checkDependencies: {
    params: { packageId: string };
    result: DataResponse<{ productIds: number[] }>;
  };
}
