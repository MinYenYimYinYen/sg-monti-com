import { AppMethod, baseAppMethod } from "@/app/appMethod/AppMethodTypes";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export type EquipmentDoc = {
  equipmentId: string;
  description: string;
  /** The AppMethod used by default for this machine. Must be a member of appMethodIds. */
  defaultAppMethodId: string;
  /** Whitelist of compatible AppMethods for this machine (same unit type — all liquid or all granular). */
  appMethodIds: string[];
  mixedProductIds: number[];
  /** When true, display water amounts as whole gallons + remaining fl oz. When false, display as decimal gallons only. */
  showFlOz: boolean;
};

export type EquipmentProps = {
  appMethod: AppMethod;
};

export type Equipment = EquipmentDoc & EquipmentProps;

export const baseEquipment: Equipment = {
  equipmentId: baseStrId,
  description: baseStrId,
  appMethod: baseAppMethod,
  mixedProductIds: [],
  appMethodIds: [],
  defaultAppMethodId: baseStrId,
  showFlOz: false,
}
