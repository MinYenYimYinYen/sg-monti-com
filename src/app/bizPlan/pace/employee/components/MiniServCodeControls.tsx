"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";
// localRange is kept in sync with the picker but is only used for display;
// updateServCode stages the change immediately on every picker change.
import { DateRangePicker } from "@/components/DateRangePicker";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { flattenEntries } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Button } from "@/style/components/button";
import { Checkbox } from "@/style/components/checkbox";
import { ChevronDown, X } from "lucide-react";

type MiniServCodeControlsProps = {
  servCode: ServCodeDeep;
  /** The trigger element — rendered as-is with a pointer cursor, opens the popover on click */
  children: React.ReactNode;
};

export function MiniServCodeControls({ servCode, children }: MiniServCodeControlsProps) {
  const [open, setOpen] = useState(false);
  const [localRange, setLocalRange] = useState<TRange<string>>(servCode.dateRange);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const { updateServCode } = useProgServ({});
  const { upsert } = useAssignmentPlan({ autoLoad: false });
  const allEmployees = useSelector(employeeSelect.employees);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);

  const assignedIds = new Set(servCode.assignedTo.map((e) => e.employeeId));
  const availableEmployees = allEmployees.filter(
    (e) => e.active && !assignedIds.has(e.employeeId),
  );

  function handleRangeChange(range: TRange<string>) {
    setLocalRange(range);
    updateServCode({ servCodeId: servCode.servCodeId, dateRange: range });
  }

  function togglePending(employee: Employee) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(employee.employeeId)) {
        next.delete(employee.employeeId);
      } else {
        next.add(employee.employeeId);
      }
      return next;
    });
  }

  function handleRemoveEmployee(employeeId: string) {
    const existingPlan = assignmentsByEmployeeId.get(employeeId);
    const existingEntries = existingPlan?.entries ?? [];
    const newEntries = existingEntries.filter((entry) =>
      entry.kind === "single"
        ? entry.servCodeId !== servCode.servCodeId
        : !entry.servCodeIds.includes(servCode.servCodeId),
    );
    upsert({ employeeId, entries: newEntries });
  }

  function handleConfirmAdd() {
    for (const employeeId of pendingIds) {
      const existingPlan = assignmentsByEmployeeId.get(employeeId);
      const existingEntries = existingPlan?.entries ?? [];
      const existingIds = new Set(flattenEntries(existingEntries));
      if (existingIds.has(servCode.servCodeId)) continue;
      const newEntries = [
        ...existingEntries,
        { kind: "single" as const, servCodeId: servCode.servCodeId },
      ];
      upsert({ employeeId, entries: newEntries });
    }
    setPendingIds(new Set());
    setAddOpen(false);
  }

  function handleAddOpenChange(nextOpen: boolean) {
    if (!nextOpen) setPendingIds(new Set());
    setAddOpen(nextOpen);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setAddOpen(false);
      setPendingIds(new Set());
    }
    setOpen(nextOpen);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {/* Wrap children in a div that looks like a normal element but has pointer cursor */}
        <div className="cursor-pointer" role="button" tabIndex={0}>
          {children}
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="start">
        <div className="bg-popover rounded-md overflow-hidden">
          {/* Header */}
          <div className="bg-accent/20 px-4 py-3 border-b">
            <p className="text-sm font-semibold text-foreground">
              {servCode.servCodeId}
            </p>
            {servCode.progCode?.progCodeId && (
              <p className="text-xs text-muted-foreground">
                {servCode.progCode.progCodeId}
              </p>
            )}
          </div>

          <div className="px-4 py-3 space-y-4">
            {/* Date range */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Date Range
              </p>
              <DateRangePicker
                value={localRange}
                onChange={handleRangeChange}
              />
            </div>

            {/* Assigned employees list */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Assigned Employees
              </p>
              {servCode.assignedTo.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No employees assigned
                </p>
              ) : (
                <div className="space-y-0.5">
                  {servCode.assignedTo.map((employee) => (
                    <div
                      key={employee.employeeId}
                      className="flex items-center justify-between gap-2 px-1 py-0.5 group"
                    >
                      <span className="text-sm text-foreground">{employee.name}</span>
                      <button
                        onClick={() => handleRemoveEmployee(employee.employeeId)}
                        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 leading-none"
                        aria-label={`Remove ${employee.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add employee */}
            {availableEmployees.length > 0 && (
              <Popover open={addOpen} onOpenChange={handleAddOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="accent"
                    intensity="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                  >
                    Add employee
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-2">
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {availableEmployees.map((employee) => (
                      <label
                        key={employee.employeeId}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/10 cursor-pointer"
                      >
                        <Checkbox
                          checked={pendingIds.has(employee.employeeId)}
                          onCheckedChange={() => togglePending(employee)}
                        />
                        <span className="text-sm text-foreground">
                          {employee.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t flex justify-end">
                    <Button
                      size="sm"
                      variant="primary"
                      intensity="solid"
                      disabled={pendingIds.size === 0}
                      onClick={handleConfirmAdd}
                      className="h-7 text-xs"
                    >
                      Add {pendingIds.size > 0 ? `(${pendingIds.size})` : ""}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
