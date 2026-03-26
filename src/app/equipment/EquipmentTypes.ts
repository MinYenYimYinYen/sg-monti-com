import { AppMethod } from "@/app/appMethod/AppMethodTypes";

export type EquipmentDoc = {
  equipmentId: string;
  description: string;
  appMethodId: string;
  mixedProductIds: number[];
};

export type EquipmentProps = {
  appMethod: AppMethod;
  waterRate: number;
};

export type Equipment = EquipmentDoc & EquipmentProps;

