import type { CapabilityRequirement } from "@/permission/PermissionTypes";
import { can } from "@/permission/can";

type Allows = (required: CapabilityRequirement) => boolean;

/**
 * One flag per read the scheduling screens (cover sheets, prenotification, loadout) load. Each
 * deps hook takes the whole object and uses the flags it needs, so a user who holds only part of
 * what a screen loads gets no refused request and no error toast. There is no flag for the loadout
 * reads themselves: the loadout layout is gated on `loadouts.read`, so those pages never mount
 * without it.
 */
export type SchedulingCanLoad = {
  customers: boolean;
  progCodes: boolean;
  servCodes: boolean;
  products: boolean;
  unitConversions: boolean;
  appMethods: boolean;
  equipment: boolean;
  equipmentPackages: boolean;
  flags: boolean;
  customerFlags: boolean;
  employees: boolean;
  callAheads: boolean;
  callAheadKeywords: boolean;
  conditionCodes: boolean;
  serviceConditions: boolean;
  globalSettings: boolean;
  serviceEtas: boolean;
  assignments: boolean;
  routeNotes: boolean;
  absences: boolean;
};

/** Pure on purpose: `allows` comes from `useSelector(userCapabilitiesSelect.allows)` in the component. */
export function schedulingCanLoad(allows: Allows): SchedulingCanLoad {
  return {
    customers: allows(can.customers.read),
    progCodes: allows(can.progCodes.read),
    servCodes: allows(can.servCodes.read),
    products: allows(can.products.read),
    unitConversions: allows(can.unitConversions.read),
    appMethods: allows(can.appMethods.read),
    equipment: allows(can.equipmentDefinitions.read),
    equipmentPackages: allows(can.equipmentPackages.read),
    flags: allows(can.flags.read),
    customerFlags: allows(can.customerFlags.read),
    employees: allows(can.employees.read),
    callAheads: allows(can.callAheads.read),
    callAheadKeywords: allows(can.callAheadKeywords.read),
    conditionCodes: allows(can.conditionCodes.read),
    serviceConditions: allows(can.serviceConditions.read),
    globalSettings: allows(can.globalSettings.read),
    serviceEtas: allows(can.serviceEtas.read),
    assignments: allows(can.serviceAssignments.read),
    routeNotes: allows(can.routeNotes.read),
    absences: allows(can.employeeAbsences.read),
  };
}
