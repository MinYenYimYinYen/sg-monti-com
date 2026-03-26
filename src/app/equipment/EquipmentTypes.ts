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

  //todo: either make CompoundUnit type: difficult
  // or make a function that returns FlowRate string, call it flowRateDisplay:
  // it can return an object with value: number, unit: string, or both: string
  // waterRateUnit: CompoundUnit;
  // ALSO, rename it to flowRate.
  // Or, keep it as FlowRate type and deal with it downstream, in which case we don't
  // even need this property because it's inside AppMethod.  That's actually
  // the smartest option. Just harder.
};

export type Equipment = EquipmentDoc & EquipmentProps;
