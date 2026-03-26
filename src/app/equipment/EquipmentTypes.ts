import { AppMethod } from "@/app/appMethod/AppMethodTypes";

export type EquipmentDoc = {
  equipmentId: string;
  description: string;
  /** The AppMethod used by default for this machine. Must be a member of appMethodIds. */
  defaultAppMethodId: string;
  /** Whitelist of compatible AppMethods for this machine (same unit type — all liquid or all granular). */
  appMethodIds: string[];
  mixedProductIds: number[];
};

export type EquipmentProps = {
  appMethod: AppMethod;
  waterRate: number;
};

export type Equipment = EquipmentDoc & EquipmentProps;
