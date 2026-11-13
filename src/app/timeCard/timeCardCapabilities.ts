import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { employeeCapabilities } from "@/app/realGreen/employee/employeeCapabilities";

// Time cards: the punches imported from the RealGreen time card CSV, and the payroll screen that
// totals them.
//
// punches.read  -> timeCard getPunches, getLastImportedDate (was admin, office and tech)
// punches.write -> timeCard importPunches (was admin and office)
//
// There is no delete: a punch is only replaced by importing it again. importPunches upserts each
// punch by `punchId` and replaces its segments, so a re-import overwrites an earlier correction.
// That is the normal way to fix a punch, so it stays under `write`.
//
// requires: both screens name employees by id, so the employee list is needed. The employee
// reads sit in the `employee` feature.
export const timeCardCapabilities = createFeatureCapabilities({
  key: "timeCard",
  resources: {
    punches: { shape: "collection", verbs: ["read", "write"] },
  },
  requires: {
    "punches.read": [employeeCapabilities.can.employees.read],
  },
});
