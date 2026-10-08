"use client";

import { useSelector } from "react-redux";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";
import { holidaySelect } from "@/app/holiday/holidaySelect";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { paceSelect } from "@/app/pace/paceSelect";



/**
 * Computes feasibility for a single assignment group directly from the hydrated
 * AssignmentGroup (which carries plannedEnd, goalsByEmployee, assignedEmployeeIds).
 * No engine run needed — the data is already in the selector layer.
 */
export function FeasibilityBadge({ groupId }: { groupId: string }) {
  const assignmentGroupMap = useSelector(
    paceAssignmentGroupSelect.assignmentGroupMap,
  );
  const holidayDates = useSelector(holidaySelect.holidayDates);
  const mainDate = useSelector(paceSelect.mainDate);

  const assignmentGroup = (
    assignmentGroupMap as Map<string, AssignmentGroup>
  ).get(groupId);
  if (!assignmentGroup) return null;

  const { plannedEnd, goalsByEmployee, assignedEmployeeIds } = assignmentGroup;

  // Compute teamGoalDailyRate
  let teamGoalDailyRate = 0;
  const missingGoals: string[] = [];
  for (const employeeId of assignedEmployeeIds) {
    const goal = goalsByEmployee.get(employeeId) ?? null;
    if (goal === null) {
      missingGoals.push(employeeId);
    } else {
      teamGoalDailyRate += goal;
    }
  }

  // Compute daysAvailable
  let daysAvailable = 0;
  if (plannedEnd && plannedEnd > mainDate) {
    const rawWeekdays = dateRanges.countWeekdays({ min: mainDate, max: plannedEnd });
    let holidayCount = 0;
    for (const holidayDate of holidayDates) {
      if (holidayDate > mainDate && holidayDate <= plannedEnd) holidayCount++;
    }
    daysAvailable = Math.max(0, rawWeekdays - holidayCount);
  }

  const isOverdue = plannedEnd !== null && plannedEnd < mainDate;
  const hasMissingGoals = missingGoals.length > 0;
  const noData = hasMissingGoals || teamGoalDailyRate === 0;

  const daysNeeded: number | null = null;
  const daysEarlyLate: number | null = null;
  const isOnTrack = false;

  const statusIcon = noData ? "—" : isOverdue ? "❌" : "📅";

  const statusColor = noData
    ? "text-muted-foreground/50"
    : isOverdue
      ? "text-destructive"
      : "text-muted-foreground";

  const label = noData ? "" : ` ${daysAvailable}d avail`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`text-[9px] font-mono font-semibold ${statusColor} hover:opacity-80`}
        >
          {statusIcon}
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 text-xs" align="start">
        <p className="font-semibold text-foreground mb-2 text-[11px]">
          Feasibility
        </p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Goal $/day</span>
            <span className="font-mono">
              {teamGoalDailyRate > 0
                ? `$${Math.round(teamGoalDailyRate).toLocaleString()}`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Days available</span>
            <span className="font-mono">{daysAvailable}</span>
          </div>
          {isOverdue && (
            <p className="text-[10px] text-destructive pt-1">
              ⚠ Past planned end date
            </p>
          )}
          {missingGoals.length > 0 && (
            <p className="text-[10px] text-secondary pt-1">
              ⚠ Missing goals for {missingGoals.length} employee
              {missingGoals.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
