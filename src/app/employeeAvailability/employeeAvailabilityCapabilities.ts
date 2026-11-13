import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// The date window in which an employee counts as workable for the pace crawler. An employee with
// no stored constraint has no restriction.
//
// availabilityConstraints.read   -> employeeAvailability getAll
// availabilityConstraints.write  -> employeeAvailability upsert
// availabilityConstraints.delete -> employeeAvailability deleteOne
//
// Removing a constraint restores full availability for the employee, which changes the pace
// numbers. The stored dates are not kept, but they can be entered again.
export const employeeAvailabilityCapabilities = createFeatureCapabilities({
  key: "employeeAvailability",
  resources: {
    availabilityConstraints: {
      shape: "collection",
      verbs: ["read", "write", "delete"],
    },
  },
});
