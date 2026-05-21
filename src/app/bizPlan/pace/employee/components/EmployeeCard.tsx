"use client";

import { useSelector } from "react-redux";
import { EmployeeCardData } from "@/app/bizPlan/pace/PaceTypes";
import { cascadeSelect } from "@/app/bizPlan/pace/selectors/cascadeSelect";
import { servCodePaceSelect } from "@/app/bizPlan/pace/selectors/servCodePaceSelect";
import { employeeCardSelect } from "@/app/bizPlan/pace/selectors/employeeCardSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { assignmentPlanActions } from "@/app/bizPlan/assignmentPlan/assignmentPlanSlice";
import { flattenEntries } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { useAppDispatch } from "@/lib/hooks/redux";
import { ServCodePriorityRow } from "@/app/bizPlan/pace/employee/components/ServCodePriorityRow";
import { AddServCodePicker } from "@/app/bizPlan/pace/employee/components/AddServCodePicker";
import { cn } from "@/style/utils";

type EmployeeCardProps = {
  cardData: EmployeeCardData;
};

export function EmployeeCard({ cardData }: EmployeeCardProps) {
  const {
    employee,
    allocations,
  } = cardData;

  const dispatch = useAppDispatch();
  const { upsert } = useAssignmentPlan({ autoLoad: false });
  const assignmentsByEmployeeId = useSelector(
    assignmentPlanSelect.assignmentsByEmployeeId,
  );
  const showUpcoming = useSelector(cascadeSelect.showUpcoming);

  const employeeId = employee.employeeId;

  const mainDate = useSelector(cascadeSelect.mainDate);

  const selectAllocationsAtDate = employeeCardSelect.makeProjectedAllocations({
    employeeId,
    date: mainDate,
  });
  const allDateAllocations = useSelector(selectAllocationsAtDate);
  const servCodePaceMap = useSelector(servCodePaceSelect.servCodePaceMap);
  const servCodePaces = useSelector(servCodePaceSelect.servCodePaces);

  const printedForEmployeeToday = servCodePaces
    .flatMap((pace) => pace.servCode.services)
    .filter(
      (service) =>
        service.lastAssigned?.employeeId === employeeId &&
        service.lastAssigned?.schedDate === mainDate,
    );

  const selectNotStartedAllocations = employeeCardSelect.makeNotStartedAllocations({
    employeeId,
  });
  const upcomingAllocations = useSelector(selectNotStartedAllocations);

  // Urgent servCodes (asap/overdue) are shown in UrgentServCodeCard — exclude them here
  const dateAllocations = allDateAllocations.filter((a) => {
    const pace = servCodePaceMap.get(a.servCode.servCodeId);
    return pace?.category !== "asap" && pace?.category !== "overdue";
  });

  // When showUpcoming is true, merge upcoming allocations into the active list using
  // the full priority order from `allocations` (cardData). This ensures up/down arrows
  // work correctly because isFirst/isLast are computed against the merged list.
  const upcomingIds = new Set(
    upcomingAllocations.map((a) => a.servCode.servCodeId),
  );
  const activeIds = new Set(dateAllocations.map((a) => a.servCode.servCodeId));

  const visibleAllocations = showUpcoming
    ? allocations.filter(
        (a) =>
          activeIds.has(a.servCode.servCodeId) ||
          upcomingIds.has(a.servCode.servCodeId),
      )
    : dateAllocations;

  const currentPlan = assignmentsByEmployeeId.get(employeeId);
  const currentEntries = currentPlan?.entries ?? [];
  const currentServCodeIds = flattenEntries(currentEntries);

  function handleMove(servCodeId: string, direction: "up" | "down") {
    const idx = currentServCodeIds.indexOf(servCodeId);
    if (idx === -1) return;
    const newOrder = [...currentServCodeIds];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    const newEntries = newOrder.map((id) => ({ kind: "single" as const, servCodeId: id }));
    dispatch(assignmentPlanActions.reorderEntries({ employeeId, entries: newEntries }));
    upsert({ employeeId, entries: newEntries });
  }

  function handleRemove(servCodeId: string) {
    const newEntries = currentEntries.filter((entry) =>
      entry.kind === "single"
        ? entry.servCodeId !== servCodeId
        : !entry.servCodeIds.includes(servCodeId),
    );
    upsert({ employeeId, entries: newEntries });
  }

  function handleAddServCodes(newServCodeIds: string[]) {
    const newEntries = [
      ...currentEntries,
      ...newServCodeIds.map((id) => ({ kind: "single" as const, servCodeId: id })),
    ];
    upsert({ employeeId, entries: newEntries });
  }

  return (
    <div className="border rounded-lg bg-card w-72 flex flex-col">
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b rounded-t-lg",
          printedForEmployeeToday.length ? "bg-destructive/10" : "bg-accent/10",
        )}
      >
        <span className="text-sm font-semibold text-foreground">
          {employee.name}
        </span>
        {printedForEmployeeToday.length ? (
          <span className="text-destructive text-xs font-medium">
            ⚠ Already Routed
          </span>
        ) : null}
      </div>

      {/* ServCode rows */}
      <div className="flex-1 px-3 py-1 divide-y divide-border/50">
        {visibleAllocations.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No active servCodes on this date
          </p>
        ) : (
          visibleAllocations.map((allocation, idx) => (
            <ServCodePriorityRow
              key={allocation.servCode.servCodeId}
              allocation={allocation}
              employeeId={employeeId}
              isFirst={idx === 0}
              isLast={idx === visibleAllocations.length - 1}
              onMoveUpAction={(id) => handleMove(id, "up")}
              onMoveDownAction={(id) => handleMove(id, "down")}
              onRemoveAction={handleRemove}
            />
          ))
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
