"use client";

import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { CalendarClock, Copy, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { paceAssignmentPlanActions } from "@/app/pace/assignmentPlan/assignmentPlanSlice";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { EmployeeAvailabilitySheet } from "@/app/employeeAvailability/_components/EmployeeAvailabilitySheet";
import { AssignmentRow } from "@/app/pace/setup/employees/_components/AssignmentRow";
import { AddGroupDropdown } from "@/app/pace/setup/employees/_components/AddGroupDropdown";
import { AddSequenceDropdown } from "@/app/pace/setup/employees/_components/AddSequenceDropdown";
import { CopyAssignmentDialog } from "@/app/pace/setup/employees/_components/CopyAssignmentDialog";
import { GroupAssignment } from "@/app/pace/assignmentPlan/AssignmentPlanTypes";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";

type EmployeeAssignmentPanelProps = {
  employeeId: string;
  selectedGroupIds: Set<string>;
  onToggleGroupSelection: (groupId: string) => void;
  otherDisplayedEmployeeIds: string[];
};

export function EmployeeAssignmentPanel({
  employeeId,
  selectedGroupIds,
  onToggleGroupSelection,
  otherDisplayedEmployeeIds,
}: EmployeeAssignmentPanelProps) {
  const dispatch = useAppDispatch();
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const assignmentGroupMap = useSelector(paceAssignmentGroupSelect.assignmentGroupMap);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);
  const isDirty = useSelector(assignmentPlanSelect.isDirty);

  const [availabilityEmployee, setAvailabilityEmployee] = useState<Employee | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const dragIndexRef = useRef<number | null>(null);

  const employee = employeeMap.get(employeeId);
  const plan = assignmentsByEmployeeId.get(employeeId);
  const groupAssignments = plan?.groupAssignments ?? [];

  // Local drag state — mirrors groupAssignments during drag, committed on drop
  const [localGroupAssignments, setLocalGroupAssignments] = useState<GroupAssignment[]>(groupAssignments);

  // Sync local state when groups are added or removed externally (length change only).
  // Order-only changes are always initiated locally and dispatched on drop — never reset those.
  if (localGroupAssignments.length !== groupAssignments.length) {
    setLocalGroupAssignments(groupAssignments);
  }

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    const next = [...localGroupAssignments];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    dragIndexRef.current = index;
    setLocalGroupAssignments(next);
  }

  function handleDrop() {
    dragIndexRef.current = null;
    dispatch(
      paceAssignmentPlanActions.reorderGroupAssignments({
        employeeId,
        groupAssignments: localGroupAssignments,
      }),
    );
  }

  function handleGoalChange(groupId: string, goal: number | null) {
    dispatch(paceAssignmentPlanActions.setGoal({ employeeId, groupId, dailyRevenueGoal: goal }));
  }

  function handleRemoveSelected() {
    const next = groupAssignments.filter((ga) => !selectedGroupIds.has(ga.groupId));
    dispatch(paceAssignmentPlanActions.reorderGroupAssignments({ employeeId, groupAssignments: next }));
    // Clear selections for removed groups
    for (const groupId of selectedGroupIds) {
      onToggleGroupSelection(groupId);
    }
    setRemoveConfirmOpen(false);
  }

  function handleAddGroup(groupId: string) {
    dispatch(
      paceAssignmentPlanActions.reorderGroupAssignments({
        employeeId,
        groupAssignments: [...groupAssignments, { groupId, dailyRevenueGoal: null }],
      }),
    );
  }

  function handleAddSequenceGroups(groupIds: string[]) {
    const newAssignments: GroupAssignment[] = groupIds.map((groupId) => ({
      groupId,
      dailyRevenueGoal: null,
    }));
    dispatch(
      paceAssignmentPlanActions.reorderGroupAssignments({
        employeeId,
        groupAssignments: [...groupAssignments, ...newAssignments],
      }),
    );
  }

  if (!employee) return null;

  // Groups that will be removed (for confirmation dialog)
  const groupsToRemove = groupAssignments.filter((ga) => selectedGroupIds.has(ga.groupId));

  return (
    <>
      <div className="border border-border rounded bg-card overflow-hidden inline-flex flex-col min-w-[300px] max-w-[420px]">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-accent/5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">
              {employee.name}
            </span>

          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selectedGroupIds.size > 0 && (
              <>
                <button
                  onClick={() => setRemoveConfirmOpen(true)}
                  className="flex items-center gap-1 h-6 px-2 rounded text-[10px] font-medium bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                  title="Remove selected groups"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove ({selectedGroupIds.size})
                </button>
                <button
                  onClick={() => setCopyDialogOpen(true)}
                  className="flex items-center gap-1 h-6 px-2 rounded text-[10px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                  title="Copy selected groups to other employees"
                >
                  <Copy className="w-3 h-3" />
                  Copy To…
                </button>
              </>
            )}
            <button
              onClick={() => setAvailabilityEmployee(employee)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
              title="Edit availability"
            >
              <CalendarClock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border">
          <AddGroupDropdown
            existingGroupAssignments={groupAssignments}
            onAddGroup={handleAddGroup}
          />
          <AddSequenceDropdown
            existingGroupAssignments={groupAssignments}
            onAddSequenceGroups={handleAddSequenceGroups}
          />
        </div>

        {/* Assignment list — scrollable, max height to keep cards compact */}
        <div className="overflow-y-auto max-h-72">
          {localGroupAssignments.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-4 px-3">
              No groups assigned.
            </p>
          ) : (
            localGroupAssignments.map((groupAssignment, index) => (
              <AssignmentRow
                key={groupAssignment.groupId}
                groupAssignment={groupAssignment}
                index={index}
                totalCount={localGroupAssignments.length}
                group={assignmentGroupMap.get(groupAssignment.groupId)}
                isSelected={selectedGroupIds.has(groupAssignment.groupId)}
                onToggleSelection={() => onToggleGroupSelection(groupAssignment.groupId)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onGoalChange={handleGoalChange}
              />
            ))
          )}
        </div>
      </div>

      {availabilityEmployee && (
        <EmployeeAvailabilitySheet
          employee={availabilityEmployee}
          onCloseAction={() => setAvailabilityEmployee(null)}
        />
      )}

      {copyDialogOpen && (
        <CopyAssignmentDialog
          sourceEmployeeId={employeeId}
          selectedGroupIds={selectedGroupIds}
          otherDisplayedEmployeeIds={otherDisplayedEmployeeIds}
          open={copyDialogOpen}
          onCloseAction={() => setCopyDialogOpen(false)}
        />
      )}

      {/* Remove confirmation dialog */}
      <Dialog open={removeConfirmOpen} onOpenChange={(v) => { if (!v) setRemoveConfirmOpen(false); }}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Remove groups?</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1">
            {groupsToRemove.map((ga) => {
              const group = assignmentGroupMap.get(ga.groupId);
              return (
                <div key={ga.groupId} className="flex items-center gap-2 px-2 py-1 rounded bg-destructive/5">
                  <span className="font-mono text-xs font-semibold text-destructive">
                    {group?.label ?? ga.groupId}
                  </span>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRemoveConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              intensity="solid"
              size="sm"
              onClick={handleRemoveSelected}
            >
              Remove ({groupsToRemove.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
