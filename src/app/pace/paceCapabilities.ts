import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { assignmentCapabilities } from "@/app/assignment/assignmentCapabilities";
import { assignmentGroupCapabilities } from "@/app/assignmentGroup/assignmentGroupCapabilities";
import { employeeAvailabilityCapabilities } from "@/app/employeeAvailability/employeeAvailabilityCapabilities";
import { holidayCapabilities } from "@/app/holiday/holidayCapabilities";

// The pace module's own stored data: assignment scenarios (who works which group, with goals),
// group sequences and season plans. The stored service code groups it also edits are the
// `assignmentGroup` feature's (same documents), so `pace/assignmentGroup` reuses
// `assignmentGroup.assignmentGroups.*` and declares nothing here.
//
// assignmentScenarios.read   -> assignmentPlan getScenarios
// assignmentScenarios.write  -> assignmentPlan upsertScenario, activateScenario
// assignmentScenarios.delete -> assignmentPlan deleteScenario
// groupSequences.read        -> groupSequence getSequences
// groupSequences.write       -> groupSequence upsertSequence
// groupSequences.delete      -> groupSequence deleteSequence
// seasonPlans.read           -> seasonPlan getSeasonPlans
// seasonPlans.write          -> seasonPlan upsertSeasonPlan, activateSeasonPlan
// seasonPlans.delete         -> seasonPlan deleteSeasonPlan
//
// Activating a scenario or season plan changes the pace numbers for everyone, but it only flips
// which stored plan is active and can be flipped back, so it stays under `write`.
//
// requires: the pace screens load the other pace data, the service code groups, holidays,
// employee availability and assignments to run the engine. RealGreen customers, programs and
// services, employees and discounts, priority services and planned time off are not declared
// yet (see the deferred table).
export const paceCapabilities = createFeatureCapabilities({
  key: "pace",
  resources: {
    assignmentScenarios: { shape: "collection", verbs: ["read", "write", "delete"] },
    groupSequences: { shape: "collection", verbs: ["read", "write", "delete"] },
    seasonPlans: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
  requires: {
    "assignmentScenarios.read": [
      "pace.groupSequences.read",
      "pace.seasonPlans.read",
      assignmentGroupCapabilities.can.assignmentGroups.read,
      holidayCapabilities.can.holidays.read,
      employeeAvailabilityCapabilities.can.availabilityConstraints.read,
      assignmentCapabilities.can.serviceAssignments.read,
    ],
  },
});
