import { Equipment } from "@/app/equipment/EquipmentTypes";

export type EquipmentPackageDoc = {
  packageId: string;
  description: string;
  equipmentIds: string[];
};

export type EquipmentPackageProps = {
  equipments: Equipment[];
};

export type EquipmentPackage = EquipmentPackageDoc & EquipmentPackageProps;
