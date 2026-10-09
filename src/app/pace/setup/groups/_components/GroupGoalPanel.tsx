"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { UserPlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { paceAssignmentPlanActions } from "@/app/pace/assignmentPlan/assignmentPlanSlice";
import { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { GroupScheduleButton } from "@/app/pace/setup/groups/_components/GroupScheduleButton";
import { AddEmployeeToGroupDialog } from "@/app/pace/setup/groups/_components/AddEmployeeToGroupDialog";
import { formatGoal } from "@/app/pace/assignments/_components/assignmentsHelpers";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";

type GroupGoalPanelProps = {
  groupId: string;
};

type RemoveTarget = {
  employeeId: string;
  employeeName: string;
};

export function GroupGoalPanel({ groupId }: GroupGoalPanelProps) {
  const dispatch = useAppDispatch();
  const assignmentGroupMap = useSelector(paceAssignmentGroupSelect.assignmentGroupMap);
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const assignmentPlans = useSelector(assignmentPlanSelect.assignmentPlans);
  const isDirty = useSelector(assignmentPlanSelect.isDirty);

  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);

  const group = assignmentGroupMap.get(groupId);
  if (!group) return null;

  // Build priority-ordered list of employees assigned to this group
  const employeeAssignments: { employeeId: string; priority: number; goal: number | null }[] = [];
  for (const plan of assignmentPlans) {
    const idx = plan.groupAssignments.findIndex((ga) => ga.groupId === groupId);
    if (idx !== -1) {
      employeeAssignments.push({
        employeeId: plan.employeeId,
        priority: idx + 1,
        goal: plan.groupAssignments[idx].dailyRevenueGoal,
      });
    }
  }
  employeeAssignments.sort((a, b) => a.priority - b.priority);

  let teamTotal = 0;
  for (const { goal } of employeeAssignments) {
    if (goal !== null) teamTotal += goal;
  }

  function handleConfirmRemove() {
    if (!removeTarget) return;
    const plan = assignmentPlans.find((p) => p.employeeId === removeTarget.employeeId);
    if (!plan) return;
    dispatch(
      paceAssignmentPlanActions.reorderGroupAssignments({
        employeeId: removeTarget.employeeId,
        groupAssignments: plan.groupAssignments.filter((ga) => ga.groupId !== groupId),
      }),
    );
    setRemoveTarget(null);
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card">
          <span className="font-mono text-sm font-semibold text-primary">
            {group.label}
          </span>

          {/* ServCode info popover */}
          {group.servCodeIds.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="p-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0 cursor-default"
                  title="ServCodes"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex flex-wrap gap-1">
                  {group.servCodeIds.map((id) => (
                    <span
                      key={id}
                      className="font-mono text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Schedule button */}
          <GroupScheduleButton group={group} />

          {/* Unsaved indicator */}
          {isDirty && (
            <span className="ml-auto text-[9px] text-secondary font-semibold uppercase tracking-wide">
              unsaved
            </span>
          )}
        </div>

        {/* Employee cards */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {employeeAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <p className="text-sm text-muted-foreground">
                No employees assigned to this group.
              </p>
              <button
                onClick={() => setAddEmployeeOpen(true)}
                className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Employee
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {employeeAssignments.map(({ employeeId, priority, goal }) => {
                const employeeName = employeeMap.get(employeeId)?.name ?? employeeId;
                return (
                  <EmployeeGoalCard
                    key={employeeId}
                    employeeId={employeeId}
                    employeeName={employeeName}
                    priority={priority}
                    goal={goal}
                    groupId={groupId}
                    onGoalChange={(newGoal) => {
                      dispatch(
                        paceAssignmentPlanActions.setGoal({
                          employeeId,
                          groupId,
                          dailyRevenueGoal: newGoal,
                        }),
                      );
                    }}
                    onRemoveRequest={() => setRemoveTarget({ employeeId, employeeName })}
                  />
                );
              })}

              {/* Team total */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 mt-2">
                <span className="text-xs font-medium text-foreground">Team total</span>
                <span className="text-xs font-mono font-semibold text-foreground">
                  {teamTotal > 0 ? `$${Math.round(teamTotal).toLocaleString()}/day` : "—"}
                </span>
              </div>

              {/* Add employee button */}
              <div className="pt-1">
                <button
                  onClick={() => setAddEmployeeOpen(true)}
                  className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Employee
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {addEmployeeOpen && (
        <AddEmployeeToGroupDialog
          group={group}
          open={addEmployeeOpen}
          onCloseAction={() => setAddEmployeeOpen(false)}
        />
      )}

      {/* Remove confirmation dialog */}
      <Dialog
        open={removeTarget !== null}
        onOpenChange={(v) => { if (!v) setRemoveTarget(null); }}
      >
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Remove assignment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Remove{" "}
            <span className="font-semibold text-foreground">{removeTarget?.employeeName}</span>{" "}
            from{" "}
            <span className="font-mono font-semibold text-primary">{group.label}</span>?
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              intensity="solid"
              size="sm"
              onClick={handleConfirmRemove}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// EmployeeGoalCard — single employee row with editable goal + remove trigger
// ---------------------------------------------------------------------------

type EmployeeGoalCardProps = {
  employeeId: string;
  employeeName: string;
  priority: number;
  goal: number | null;
  groupId: string;
  onGoalChange: (goal: number | null) => void;
  onRemoveRequest: () => void;
};

function EmployeeGoalCard({
  employeeName,
  priority,
  goal,
  onGoalChange,
  onRemoveRequest,
}: EmployeeGoalCardProps) {
  const [inputValue, setInputValue] = useState(formatGoal(goal));

  function handleBlur() {
    const trimmed = inputValue.trim();
    if (trimmed === "") {
      onGoalChange(null);
      return;
    }
    const n = parseFloat(trimmed);
    if (!isNaN(n) && n >= 0) {
      onGoalChange(n);
      setInputValue(String(Math.round(n)));
    } else {
      setInputValue(formatGoal(goal));
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded border border-border/50 bg-card hover:bg-accent/5 group/card">
      {/* Priority badge */}
      <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0 font-mono">
        {priority}
      </span>

      {/* Employee name */}
      <span className="text-xs text-foreground flex-1 truncate">{employeeName}</span>

      {/* Goal input */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-muted-foreground">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          placeholder="goal"
          className="w-20 h-6 text-xs px-1.5 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
        />
        <span className="text-[10px] text-muted-foreground">/day</span>
      </div>

      {/* Remove button — visible on hover */}
      <button
        onClick={onRemoveRequest}
        className="p-0.5 rounded text-muted-foreground/0 group-hover/card:text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        title="Remove from group"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
