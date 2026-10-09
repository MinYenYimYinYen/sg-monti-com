/**
 * Barrel re-export of every selector needed anywhere inside the pace module.
 * Sub-pages import from here — not from individual slice selector files.
 * If a selector moves, only this file changes.
 */

// --- Pace-owned data modules ---
export { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
export { paceGroupSequenceSelect } from "@/app/pace/groupSequence/groupSequenceSelect";
export { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
export { paceSeasonPlanSelect } from "@/app/pace/seasonPlan/seasonPlanSelect";

// --- External selectors consumed by the engine and sub-pages ---
export { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
export { holidaySelect } from "@/app/holiday/holidaySelect";
export { deepSelect } from "@/app/realGreen/deepSelect";
export { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
export { plannedTimeOffSelect } from "@/app/plannedTimeOff/plannedTimeOffSelect";
export { employeeAvailabilitySelect } from "@/app/employeeAvailability/employeeAvailabilitySelect";
export { priorityServiceSelect } from "@/app/priorityService/priorityServiceSelect";
export { assignmentSelect } from "@/app/assignment/assignmentSelect";
export { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
