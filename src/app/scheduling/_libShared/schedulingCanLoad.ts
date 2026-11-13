import type { CapabilityRequirement } from "@/permission/PermissionTypes";
import { appMethodCapabilities } from "@/app/appMethod/appMethodCapabilities";
import { assignmentCapabilities } from "@/app/assignment/assignmentCapabilities";
import { equipmentCapabilities } from "@/app/equipment/equipmentCapabilities";
import { globalSettingsCapabilities } from "@/app/globalSettings/globalSettingsCapabilities";
import { plannedTimeOffCapabilities } from "@/app/plannedTimeOff/plannedTimeOffCapabilities";
import { callAheadCapabilities } from "@/app/realGreen/callAhead/callAheadCapabilities";
import { conditionCodeCapabilities } from "@/app/realGreen/conditionCode/conditionCodeCapabilities";
import { custFlagCapabilities } from "@/app/realGreen/custFlag/custFlagCapabilities";
import { customerCapabilities } from "@/app/realGreen/customer/customerCapabilities";
import { employeeCapabilities } from "@/app/realGreen/employee/employeeCapabilities";
import { flagCapabilities } from "@/app/realGreen/flag/flagCapabilities";
import { productCapabilities } from "@/app/realGreen/product/productCapabilities";
import { progServCapabilities } from "@/app/realGreen/progServ/progServCapabilities";
import { serviceConditionCapabilities } from "@/app/realGreen/serviceCondition/serviceConditionCapabilities";
import { routeNoteCapabilities } from "@/app/routeNotes/routeNoteCapabilities";
import { schedulingCapabilities } from "@/app/scheduling/schedulingCapabilities";

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
    customers: allows(customerCapabilities.can.customers.read),
    progCodes: allows(progServCapabilities.can.progCodes.read),
    servCodes: allows(progServCapabilities.can.servCodes.read),
    products: allows(productCapabilities.can.products.read),
    unitConversions: allows(productCapabilities.can.unitConversions.read),
    appMethods: allows(appMethodCapabilities.can.appMethods.read),
    equipment: allows(equipmentCapabilities.can.equipmentDefinitions.read),
    equipmentPackages: allows(equipmentCapabilities.can.equipmentPackages.read),
    flags: allows(flagCapabilities.can.flags.read),
    customerFlags: allows(custFlagCapabilities.can.customerFlags.read),
    employees: allows(employeeCapabilities.can.employees.read),
    callAheads: allows(callAheadCapabilities.can.callAheads.read),
    callAheadKeywords: allows(callAheadCapabilities.can.keywords.read),
    conditionCodes: allows(conditionCodeCapabilities.can.conditionCodes.read),
    serviceConditions: allows(serviceConditionCapabilities.can.serviceConditions.read),
    globalSettings: allows(globalSettingsCapabilities.can.settings.read),
    serviceEtas: allows(schedulingCapabilities.can.serviceEtas.read),
    assignments: allows(assignmentCapabilities.can.serviceAssignments.read),
    routeNotes: allows(routeNoteCapabilities.can.routeNotes.read),
    absences: allows(plannedTimeOffCapabilities.can.absences.read),
  };
}
