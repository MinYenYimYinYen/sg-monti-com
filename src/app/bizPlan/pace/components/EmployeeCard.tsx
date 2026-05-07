"use client";

import { useSelector } from "react-redux";
import { EmployeeCardData } from "@/app/bizPlan/pace/PaceType";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { assignmentPlanActions } from "@/app/bizPlan/assignmentPlan/assignmentPlanSlice";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { useAppDispatch } from "@/lib/hooks/redux";
import { employeePaceSelect } from "@/app/bizPlan/pace/employee/employeePaceSelect";
import { ServCodePriorityRow } from "@/app/bizPlan/pace/components/ServCodePriorityRow";
import { AddServCodePicker } from "@/app/bizPlan/pace/components/AddServCodePicker";
import { cn } from "@/style/utils";

type EmployeeCardProps = {
  cardData: EmployeeCardData;
};

export function EmployeeCard({ cardData }: EmployeeCardProps) {
  const { employee, allocations, isOverloaded } = cardData;

  const dispatch = useAppDispatch();
  const { upsert } = useAssignmentPlan({ autoLoad: false });
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);

  const employeeId = employee.employeeId;

  const selectAllocationsAtDate = employeePaceSelect.makeAllocationsAtDate({
    employeeId,
    date: useSelector(employeePaceSelect.mainDate),
  });
  const dateAllocations = useSelector(selectAllocationsAtDate);

  const currentServCodeIds = assignmentsByEmployeeId.get(employeeId)?.servCodeIds ?? [];

  function handleMove(servCodeId: string, direction: "up" | "down") {
    const idx = currentServCodeIds.indexOf(servCodeId);
    if (idx === -1) return;
    const newOrder = [...currentServCodeIds];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    dispatch(
      assignmentPlanActions.reorderServCodes({
        employeeId,
        servCodeIds: newOrder,
      }),
    );
    upsert({ employeeId, servCodeIds: newOrder });
  }

  function handleRemove(servCodeId: string) {
    const updatedServCodeIds = currentServCodeIds.filter((id) => id !== servCodeId);
    upsert({ employeeId, servCodeIds: updatedServCodeIds });
  }

  function handleAddServCodes(newServCodeIds: string[]) {
    const updatedServCodeIds = [...currentServCodeIds, ...newServCodeIds];
    upsert({ employeeId, servCodeIds: updatedServCodeIds });
  }

  return (
    <div className="border rounded-lg bg-card w-72 flex flex-col">
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b rounded-t-lg",
          isOverloaded ? "bg-destructive/10" : "bg-accent/10",
        )}
      >
        <span className="text-sm font-semibold text-foreground">
          {employee.name}
        </span>
        {isOverloaded && (
          <span className="text-destructive text-xs font-medium">⚠ Overloaded</span>
        )}
      </div>

      {/* ServCode rows — date-parameterized */}
      <div className="flex-1 px-3 py-1 divide-y divide-border/50">
        {dateAllocations.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No active servCodes on this date
          </p>
        ) : (
          dateAllocations.map((allocation) => {
            const fullIdx = allocations.findIndex(
              (a) => a.servCode.servCodeId === allocation.servCode.servCodeId,
            );
            return (
              <ServCodePriorityRow
                key={allocation.servCode.servCodeId}
                allocation={allocation}
                isFirst={fullIdx === 0}
                isLast={fullIdx === allocations.length - 1}
                onMoveUpAction={(id) => handleMove(id, "up")}
                onMoveDownAction={(id) => handleMove(id, "down")}
                onRemoveAction={handleRemove}
              />
            );
          })
        )}
      </div>

      {/* Add servCode */}
      <div className="px-3 py-2 border-t">
        <AddServCodePicker
          employeeId={employeeId}
          assignedServCodeIds={currentServCodeIds}
          onConfirmAction={handleAddServCodes}
        />
      </div>
    </div>
  );
}
