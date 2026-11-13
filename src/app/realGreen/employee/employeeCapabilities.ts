import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// RealGreen's active employees (name, contact details), read live from RealGreen and joined with
// the stored employee properties kept here.
//
// employees.realGreen.read -> realGreen/employee getAll
//
// Read only: the contract has no write, and this app never changes RealGreen's employees. The
// "view active employees" page is its own screen. Many other screens load the employees to show a
// name instead of an id (pace, cover sheets, loadout, time cards, planned time off), so they list
// this read in their own `requires` (deferred, see the record).
export const employeeCapabilities = createFeatureCapabilities({
  key: "employee",
  resources: {
    employees: { shape: "collection", source: "realGreen", verbs: ["read"] },
  },
});
