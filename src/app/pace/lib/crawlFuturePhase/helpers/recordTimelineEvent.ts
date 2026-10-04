import { EmployeeTimelineEvent, ServCodeTimelineEvent } from "@/app/pace/PaceEngineTypes";

/**
 * Appends an employee timeline event to the employee's event list.
 */
export function recordEmployeeTimelineEvent(
  employeeTimeline: Map<string, { date: string; event: EmployeeTimelineEvent }[]>,
  employeeId: string,
  date: string,
  event: EmployeeTimelineEvent,
): void {
  const events = employeeTimeline.get(employeeId) ?? [];
  events.push({ date, event });
  employeeTimeline.set(employeeId, events);
}

/**
 * Appends a crew transition event to the group's crew timeline.
 */
export function recordCrewTimelineEvent(
  crewTimelines: Map<string, ServCodeTimelineEvent[]>,
  groupId: string,
  event: ServCodeTimelineEvent,
): void {
  const events = crewTimelines.get(groupId) ?? [];
  events.push(event);
  crewTimelines.set(groupId, events);
}
