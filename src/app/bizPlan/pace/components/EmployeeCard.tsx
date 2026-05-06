"use client";

import { useSelector } from "react-redux";
import { EmployeeCardData, PaceCategory } from "@/app/bizPlan/pace/PaceType";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { assignmentPlanActions } from "@/app/bizPlan/assignmentPlan/assignmentPlanSlice";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { ServCodePriorityRow } from "@/app/bizPlan/pace/components/ServCodePriorityRow";
import { AddServCodePicker } from "@/app/bizPlan/pace/components/AddServCodePicker";
import { Number } from "@/components/Number";
import { cn } from "@/style/utils";

type EmployeeCardProps = {
  cardData: EmployeeCardData;
  visibleCategories: PaceCategory[];
};

export function EmployeeCard({ cardData, visibleCategories }: EmployeeCardProps) {
  const { employee, allocations, totalFractionConsumed, freeCapacityFraction, isOverloaded } =
    cardData;

  const dispatch = useAppDispatch();
  const { upsert } = useAssignmentPlan({ autoLoad: false });
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);
  const servCodePaceMap = useSelector(paceSelect.servCodePaceMap);

  const currentServCodeIds = assignmentsByEmployeeId.get(employee.employeeId)?.servCodeIds ?? [];

  function handleMove(servCodeId: string, direction: "up" | "down") {
    const idx = currentServCodeIds.indexOf(servCodeId);
    if (idx === -1) return;
    const newOrder = [...currentServCodeIds];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    dispatch(
      assignmentPlanActions.reorderServCodes({
        employeeId: employee.employeeId,
        servCodeIds: newOrder,
      }),
    );
    upsert({ employeeId: employee.employeeId, servCodeIds: newOrder });
  }

  function handleRemove(servCodeId: string) {
    const updatedServCodeIds = currentServCodeIds.filter((id) => id !== servCodeId);
    upsert({ employeeId: employee.employeeId, servCodeIds: updatedServCodeIds });
  }

  function handleAddServCodes(newServCodeIds: string[]) {
    const updatedServCodeIds = [...currentServCodeIds, ...newServCodeIds];
    upsert({ employeeId: employee.employeeId, servCodeIds: updatedServCodeIds });
  }

  // Filter allocations by visible categories
  const visibleAllocations = allocations.filter((allocation) => {
    const pace = servCodePaceMap.get(allocation.servCode.servCodeId);
    if (!pace) return true; // show if we can't determine category
    return visibleCategories.includes(pace.category);
  });

  const totalPct = totalFractionConsumed?.count ?? null;

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

      {/* ServCode rows */}
      <div className="flex-1 px-3 py-1 divide-y divide-border/50">
        {visibleAllocations.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No rows match the current filter
          </p>
        ) : (
          visibleAllocations.map((allocation, idx) => {
            // Reorder controls use the full (unfiltered) allocation list indices
            const fullIdx = allocations.indexOf(allocation);
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

      {/* Footer */}
      {totalFractionConsumed && (
        <div
          className={cn(
            "px-3 py-2 border-t text-xs font-mono flex items-center justify-between",
            isOverloaded ? "bg-destructive/5" : "bg-muted/20",
          )}
        >
          <span className="text-muted-foreground">Consumed</span>
          <span
            className={cn(
              "font-medium",
              isOverloaded ? "text-destructive" : "text-foreground",
            )}
          >
            <Number decimals={0}>{totalPct! * 100}</Number>%
          </span>
          {freeCapacityFraction && !isOverloaded && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">Free</span>
              <span className="font-medium text-accent">
                <Number decimals={0}>{freeCapacityFraction.count * 100}</Number>%
              </span>
            </>
          )}
        </div>
      )}

      {/* Add servCode */}
      <div className="px-3 py-2 border-t">
        <AddServCodePicker
          employeeId={employee.employeeId}
          assignedServCodeIds={currentServCodeIds}
          onConfirmAction={handleAddServCodes}
        />
      </div>
    </div>
  );
}
