import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { assignmentCapabilities } from "@/app/assignment/assignmentCapabilities";
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

// Scheduling: the daily loadout records (start and finish of a tech's truck) and the ETAs that
// cover sheets and prenotification show.
//
// loadouts.read     -> dailyInventory getLoadouts, getLoadout, getLoadoutKeys
// loadouts.write    -> dailyInventory upsertLoadout
// serviceEtas.read  -> eta getServiceEtas
// serviceEtas.write -> eta saveServiceEta
//
// There is no delete: a loadout or an ETA is only ever replaced by saving again. Start and finish
// loadout both go through upsertLoadout, so they share `loadouts.write`. That op replaces the
// stored document whole, including a finished one, with no check.
//
// The cover sheet and prenotification screens own no data of their own, so they use
// `serviceEtas.read` as their entry capability and list everything they load in its `requires`.
// The loadout screens do the same with `loadouts.read`. Both lists only guide the admin screens:
// nothing here grants a requirement at runtime.
export const schedulingCapabilities = createFeatureCapabilities({
  key: "scheduling",
  resources: {
    loadouts: { shape: "collection", verbs: ["read", "write"] },
    serviceEtas: { shape: "collection", verbs: ["read", "write"] },
  },
  requires: {
    "loadouts.read": [
      customerCapabilities.can.customers.read,
      employeeCapabilities.can.employees.read,
      productCapabilities.can.products.read,
      progServCapabilities.can.progCodes.read,
      progServCapabilities.can.servCodes.read,
      assignmentCapabilities.can.serviceAssignments.read,
      globalSettingsCapabilities.can.settings.read,
    ],
    "serviceEtas.read": [
      customerCapabilities.can.customers.read,
      employeeCapabilities.can.employees.read,
      productCapabilities.can.products.read,
      progServCapabilities.can.progCodes.read,
      progServCapabilities.can.servCodes.read,
      assignmentCapabilities.can.serviceAssignments.read,
      globalSettingsCapabilities.can.settings.read,
      flagCapabilities.can.flags.read,
      custFlagCapabilities.can.customerFlags.read,
      callAheadCapabilities.can.callAheads.read,
      callAheadCapabilities.can.keywords.read,
      conditionCodeCapabilities.can.conditionCodes.read,
      serviceConditionCapabilities.can.serviceConditions.read,
      routeNoteCapabilities.can.routeNotes.read,
      plannedTimeOffCapabilities.can.absences.read,
    ],
  },
});
