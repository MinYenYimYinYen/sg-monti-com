"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { ChevronUp, ChevronDown, X, Plus, CalendarClock } from "lucide-react";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { paceAssignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { paceAssignmentPlanActions } from "@/app/pace/assignmentPlan/assignmentPlanSlice";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { EmployeeAvailabilitySheet } from "@/app/employeeAvailability/_components/EmployeeAvailabilitySheet";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { GroupAssignment } from "@/app/pace/assignmentPlan/AssignmentPlanTypes";
import { formatGoal } from "@/app/pace/assignments/_components/assignmentsHelpers";

export function EmployeeAssignmentCard({ employeeId }: { employeeId: string }) {
  const dispatch = useAppDispatch();
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const groupMap = useSelector(paceAssignmentGroupSelect.groupMap);
  const assignmentsByEmployeeId = useSelector(paceAssignmentPlanSelect.assignmentsByEmployeeId);
  const groups = useSelector(paceAssignmentGroupSelect.groups);
  const [openAdd, setOpenAdd] = useState(false);
  const [availabilitySheetEmployee, setAvailabilitySheetEmployee] = useState<Employee | null>(null);

  const employee = employeeMap.get(employeeId);
  if (!employee) return null;

  const plan = assignmentsByEmployeeId.get(employeeId);
  const groupAssignments = plan?.groupAssignments ?? [];
  const existingGroupIds = new Set(groupAssignments.map((ga) => ga.groupId));
  const hasAvailability = !!(employee.availability.startDate || employee.availability.endDate);

  function handleReorder(newGroupAssignments: GroupAssignment[]) {
    dispatch(
      paceAssignmentPlanActions.reorderGroupAssignments({ employeeId, groupAssignments: newGroupAssignments }),
    );
  }

  function handleSetGoal(groupId: string, dailyRevenueGoal: number | null) {
    dispatch(paceAssignmentPlanActions.setGoal({ employeeId, groupId, dailyRevenueGoal }));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...groupAssignments];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    handleReorder(next);
  }

  function moveDown(index: number) {
    if (index === groupAssignments.length - 1) return;
    const next = [...groupAssignments];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    handleReorder(next);
  }

  function remove(index: number) {
    handleReorder(groupAssignments.filter((_, i) => i !== index));
  }

  function addGroup(groupId: string) {
    handleReorder([...groupAssignments, { groupId, dailyRevenueGoal: null }]);
    setOpenAdd(false);
  }

  const availableGroups = groups
    .filter((g) => !existingGroupIds.has(g.groupId))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="border border-border rounded overflow-hidden">
      <div className="px-3 py-2 bg-accent/10 border-b border-border flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">{employee.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {groupAssignments.length} groups
            {hasAvailability && (
              <span className="ml-2 text-primary">
                {employee.availability.startDate && `from ${employee.availability.startDate}`}
                {employee.availability.startDate && employee.availability.endDate && " · "}
                {employee.availability.endDate && `until ${employee.availability.endDate}`}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setAvailabilitySheetEmployee(employee)}
          className={`p-1 rounded transition-colors shrink-0 ${hasAvailability ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent/10"}`}
          title="Edit availability"
        >
          <CalendarClock className="w-3 h-3" />
        </button>
      </div>

      <div className="divide-y divide-border/50">
        {groupAssignments.length === 0 && (
          <p className="px-3 py-2 text-[10px] text-muted-foreground">No groups assigned.</p>
        )}
        {groupAssignments.map(({ groupId, dailyRevenueGoal }, index) => {
          const group = groupMap.get(groupId);
          const label = group?.label ?? groupId;
          return (
            <div key={index} className="flex items-center gap-1.5 px-2 py-1.5 text-xs">
              <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">
                {index + 1}
              </span>
              <div className="flex items-center gap-0 shrink-0">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-0.5 rounded hover:bg-accent/20 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === groupAssignments.length - 1}
                  className="p-0.5 rounded hover:bg-accent/20 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <span className="font-mono text-primary font-semibold">{label}</span>
              <div className="flex items-center gap-0.5 shrink-0 ml-auto">
                <span className="text-[9px] text-muted-foreground">$</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formatGoal(dailyRevenueGoal)}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (v === "") {
                      handleSetGoal(groupId, null);
                      return;
                    }
                    const n = parseFloat(v);
                    if (!isNaN(n) && n >= 0) handleSetGoal(groupId, n);
                  }}
                  placeholder="goal"
                  className="w-16 h-5 text-[10px] px-1 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                <span className="text-[9px] text-muted-foreground">/day</span>
              </div>
              <button
                onClick={() => remove(index)}
                className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add group */}
      <div className="border-t border-border/50 bg-card">
        <button
          onClick={() => setOpenAdd((v) => !v)}
          className="w-full flex items-center gap-1.5 px-3 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors text-left"
        >
          <Plus className="w-3 h-3" />
          <span>Add group</span>
        </button>
        {openAdd && availableGroups.length > 0 && (
          <div className="px-3 pb-2 space-y-0.5">
            {availableGroups.map((group) => (
              <button
                key={group.groupId}
                onClick={() => addGroup(group.groupId)}
                className="w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-primary/10 text-[10px] transition-colors"
              >
                <span className="font-mono text-primary font-semibold">{group.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {availabilitySheetEmployee && (
        <EmployeeAvailabilitySheet
          employee={availabilitySheetEmployee}
          onClose={() => setAvailabilitySheetEmployee(null)}
        />
      )}
    </div>
  );
}
