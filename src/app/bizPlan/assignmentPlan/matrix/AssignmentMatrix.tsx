"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { usePaceDeps } from "@/app/bizPlan/pace/usePaceDeps";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { assignmentPlanActions } from "@/app/bizPlan/assignmentPlan/assignmentPlanSlice";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { ProgCodePace, ServCodePace } from "@/app/bizPlan/pace/PaceType";
import { MiniServCodeControls } from "@/app/bizPlan/pace/employee/components/MiniServCodeControls";
import { Number } from "@/components/Number";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { cn } from "@/style/utils";
import { CountSizePrice } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

// ---------------------------------------------------------------------------
// CspDisplay — renders count/size/price with conventional symbols
// ---------------------------------------------------------------------------

function CspDisplay({ csp }: { csp: CountSizePrice }) {
  return (
    <span className="flex gap-1 text-[10px] text-muted-foreground">
      <span>
        #<Number>{csp.count}</Number>
      </span>
      <span>
        ◻<Number>{csp.size}</Number>
      </span>
      <span>
        $<Number>{csp.price}</Number>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// AssignmentMatrix — root component
// Axes: rows = programs/servCodes, columns = employees
// ---------------------------------------------------------------------------

export function AssignmentMatrix() {
  usePaceDeps();
  useAssignmentPlan({ autoLoad: false }); // already loaded by usePaceDeps

  const allEmployees = useSelector(employeeSelect.employees);
  const activeEmployees = allEmployees.filter((e) => e.active);

  // Use filteredSortedProgCodePaces for the default sort (urgency → dateRange.min → alpha)
  const progCodePaces = useSelector(paceSelect.filteredSortedProgCodePaces);

  const assignmentsByEmployeeId = useSelector(
    assignmentPlanSelect.assignmentsByEmployeeId,
  );
  const { upsert } = useAssignmentPlan({ autoLoad: false });
  const dispatch = useAppDispatch();

  // Local state: which employees are shown as columns
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Track expanded programs — default empty = all collapsed
  const [expandedProgIds, setExpandedProgIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Hover state for row/column highlighting
  const [hoveredServCodeId, setHoveredServCodeId] = useState<string | null>(null);
  const [hoveredEmployeeId, setHoveredEmployeeId] = useState<string | null>(null);

  const selectedEmployees = activeEmployees.filter((e) =>
    selectedEmployeeIds.has(e.employeeId),
  );

  function toggleEmployee(employeeId: string) {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedEmployeeIds(new Set(activeEmployees.map((e) => e.employeeId)));
  }

  function clearAll() {
    setSelectedEmployeeIds(new Set());
  }

  function selectAssigned() {
    const assignedIds = new Set(
      activeEmployees
        .filter(
          (e) => (assignmentsByEmployeeId.get(e.employeeId)?.servCodeIds.length ?? 0) > 0,
        )
        .map((e) => e.employeeId),
    );
    setSelectedEmployeeIds(assignedIds);
  }

  function toggleProgExpand(progCodeId: string) {
    setExpandedProgIds((prev) => {
      const next = new Set(prev);
      if (next.has(progCodeId)) {
        next.delete(progCodeId);
      } else {
        next.add(progCodeId);
      }
      return next;
    });
  }

  function handleUpsert(employeeId: string, newServCodeIds: string[]) {
    dispatch(
      assignmentPlanActions.reorderServCodes({ employeeId, servCodeIds: newServCodeIds }),
    );
    upsert({ employeeId, servCodeIds: newServCodeIds });
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — employee selector */}
      <div className="w-56 shrink-0 border-r flex flex-col bg-card">
        <div className="px-3 py-2 border-b">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Employees
            </span>
            <div className="flex gap-1 items-center">
              <button
                onClick={selectAll}
                className="text-[10px] text-primary hover:underline"
              >
                All
              </button>
              <span className="text-muted-foreground text-[10px]">/</span>
              <button
                onClick={clearAll}
                className="text-[10px] text-muted-foreground hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
          <button
            onClick={selectAssigned}
            className="text-[10px] text-accent-foreground bg-accent/20 hover:bg-accent/30 rounded px-1.5 py-0.5 transition-colors"
          >
            Select Assigned
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {activeEmployees.map((employee) => {
            const assignedCount =
              assignmentsByEmployeeId.get(employee.employeeId)?.servCodeIds.length ?? 0;
            return (
              <label
                key={employee.employeeId}
                className="flex items-center gap-2 px-3 py-1 text-xs cursor-pointer hover:bg-accent/10"
              >
                <input
                  type="checkbox"
                  checked={selectedEmployeeIds.has(employee.employeeId)}
                  onChange={() => toggleEmployee(employee.employeeId)}
                  className="accent-primary"
                />
                <span className="text-foreground truncate flex-1">{employee.name}</span>
                {assignedCount > 0 && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {assignedCount}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Matrix area */}
      <div className="flex-1 overflow-auto">
        {selectedEmployees.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select employees from the left panel to begin
          </div>
        ) : (
          <table className="border-collapse text-xs w-max min-w-full">
            {/* Header row: one column per selected employee */}
            <thead className="sticky top-0 z-10 bg-card">
              <tr>
                {/* Label column */}
                <th className="border border-border px-3 py-1.5 text-left font-semibold text-foreground bg-accent/10 sticky left-0 z-20 min-w-56">
                  Program / ServCode
                </th>
                {selectedEmployees.map((employee) => {
                  const assignedCount =
                    assignmentsByEmployeeId.get(employee.employeeId)?.servCodeIds.length ?? 0;
                  const isHovered = hoveredEmployeeId === employee.employeeId;
                  return (
                    <th
                      key={employee.employeeId}
                      className={cn(
                        "border border-border px-2 py-1.5 text-center bg-accent/10 whitespace-nowrap min-w-20 transition-colors",
                        isHovered && "bg-primary/10",
                      )}
                      onMouseEnter={() => setHoveredEmployeeId(employee.employeeId)}
                      onMouseLeave={() => setHoveredEmployeeId(null)}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={cn("font-semibold text-foreground", isHovered && "font-bold")}>
                          {employee.name}
                        </span>
                        {assignedCount > 0 && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {assignedCount} codes
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {progCodePaces.map((progCodePace) => {
                const isExpanded = expandedProgIds.has(progCodePace.progCode.progCodeId);
                return (
                  <MatrixProgGroup
                    key={progCodePace.progCode.progCodeId}
                    progCodePace={progCodePace}
                    isExpanded={isExpanded}
                    selectedEmployees={selectedEmployees}
                    assignmentsByEmployeeId={assignmentsByEmployeeId}
                    hoveredServCodeId={hoveredServCodeId}
                    hoveredEmployeeId={hoveredEmployeeId}
                    onToggleExpand={() => toggleProgExpand(progCodePace.progCode.progCodeId)}
                    onUpsert={handleUpsert}
                    onHoverServCode={setHoveredServCodeId}
                    onHoverEmployee={setHoveredEmployeeId}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MatrixProgGroup — program header row + optional servCode rows
// ---------------------------------------------------------------------------

type MatrixProgGroupProps = {
  progCodePace: ProgCodePace;
  isExpanded: boolean;
  selectedEmployees: Employee[];
  assignmentsByEmployeeId: Map<string, { servCodeIds: string[] }>;
  hoveredServCodeId: string | null;
  hoveredEmployeeId: string | null;
  onToggleExpand: () => void;
  onUpsert: (employeeId: string, servCodeIds: string[]) => void;
  onHoverServCode: (id: string | null) => void;
  onHoverEmployee: (id: string | null) => void;
};

function MatrixProgGroup({
  progCodePace,
  isExpanded,
  selectedEmployees,
  assignmentsByEmployeeId,
  hoveredServCodeId,
  hoveredEmployeeId,
  onToggleExpand,
  onUpsert,
  onHoverServCode,
  onHoverEmployee,
}: MatrixProgGroupProps) {
  const { progCode, servCodePaces } = progCodePace;
  const progServCodeIds = servCodePaces.map((sp) => sp.servCode.servCodeId);

  // Date range from servCodes[0] (already sorted alphabetically in progServSelect)
  const firstServCode = servCodePaces[0]?.servCode;
  const progDateMin = firstServCode?.dateRange.min ?? "";
  const progDateMax = firstServCode?.dateRange.max ?? "";

  // Unique employee count across all servCodes in this program
  const assignedEmployeeIds = new Set(
    servCodePaces.flatMap((sp) => sp.servCode.assignedTo.map((e) => e.employeeId)),
  );

  // Avg CSP: average teamAvgCapacity across servCodes in this program
  const validTeamAvgs = servCodePaces
    .map((sp) => sp.teamAvgCapacity)
    .filter((csp) => csp.count > 0 || csp.size > 0 || csp.price > 0);
  const progAvgCapacity: CountSizePrice | null =
    validTeamAvgs.length > 0
      ? {
          count: validTeamAvgs.reduce((s, c) => s + c.count, 0) / validTeamAvgs.length,
          size: validTeamAvgs.reduce((s, c) => s + c.size, 0) / validTeamAvgs.length,
          price: validTeamAvgs.reduce((s, c) => s + c.price, 0) / validTeamAvgs.length,
          rev: validTeamAvgs.reduce((s, c) => s + c.rev, 0) / validTeamAvgs.length,
        }
      : null;

  function getAssignedSet(employee: Employee): Set<string> {
    return new Set(assignmentsByEmployeeId.get(employee.employeeId)?.servCodeIds ?? []);
  }

  function toggleProgForEmployee(employee: Employee) {
    const currentIds = assignmentsByEmployeeId.get(employee.employeeId)?.servCodeIds ?? [];
    const assignedSet = getAssignedSet(employee);
    const allAssigned = progServCodeIds.every((id) => assignedSet.has(id));

    let newIds: string[];
    if (allAssigned) {
      const removeSet = new Set(progServCodeIds);
      newIds = currentIds.filter((id) => !removeSet.has(id));
    } else {
      const toAdd = progServCodeIds.filter((id) => !assignedSet.has(id));
      newIds = [...currentIds, ...toAdd].sort((a, b) => a.localeCompare(b));
    }
    onUpsert(employee.employeeId, newIds);
  }

  function toggleServCodeForEmployee(employee: Employee, servCodeId: string) {
    const currentIds = assignmentsByEmployeeId.get(employee.employeeId)?.servCodeIds ?? [];
    const assignedSet = getAssignedSet(employee);

    let newIds: string[];
    if (assignedSet.has(servCodeId)) {
      newIds = currentIds.filter((id) => id !== servCodeId);
    } else {
      newIds = [...currentIds, servCodeId].sort((a, b) => a.localeCompare(b));
    }
    onUpsert(employee.employeeId, newIds);
  }

  return (
    <>
      {/* Program header row */}
      <tr className="bg-accent/5 hover:bg-accent/10">
        <td className="border border-border px-2 py-1.5 sticky left-0 bg-accent/5 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary transition-colors shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
            {/* progCodeId */}
            <span className="font-mono font-semibold text-foreground">
              {progCode.progCodeId}
            </span>
            {/* Stacked date range */}
            {progDateMin && (
              <div className="flex flex-col leading-none text-[10px] text-muted-foreground">
                <span>{formatDate(progDateMin)}</span>
                <span>{formatDate(progDateMax)}</span>
              </div>
            )}
            {/* Employee count */}
            <span className="text-[10px] text-muted-foreground">
              {assignedEmployeeIds.size} emp
            </span>
            {/* Avg CSP */}
            {progAvgCapacity !== null && <CspDisplay csp={progAvgCapacity} />}
          </div>
        </td>

        {selectedEmployees.map((employee) => {
          const assignedSet = getAssignedSet(employee);
          const assignedCount = progServCodeIds.filter((id) => assignedSet.has(id)).length;
          const allAssigned = assignedCount === progServCodeIds.length;
          const someAssigned = assignedCount > 0 && !allAssigned;
          const isColHovered = hoveredEmployeeId === employee.employeeId;

          return (
            <td
              key={employee.employeeId}
              className={cn(
                "border border-border px-2 py-1.5 text-center bg-accent/5 transition-colors",
                isColHovered && "bg-primary/10",
              )}
              onMouseEnter={() => onHoverEmployee(employee.employeeId)}
              onMouseLeave={() => onHoverEmployee(null)}
            >
              <input
                type="checkbox"
                checked={allAssigned}
                ref={(el) => {
                  if (el) el.indeterminate = someAssigned;
                }}
                onChange={() => toggleProgForEmployee(employee)}
                className="accent-primary cursor-pointer"
                aria-label={`Toggle all ${progCode.progCodeId} for ${employee.name}`}
              />
            </td>
          );
        })}
      </tr>

      {/* ServCode rows — only when expanded */}
      {isExpanded &&
        servCodePaces.map((scPace) => {
          const sc = scPace.servCode;
          const isRowHovered = hoveredServCodeId === sc.servCodeId;

          // Avg CSP for this servCode — use teamAvgCapacity directly
          const scAvgCapacity =
            scPace.teamAvgCapacity.count > 0 ||
            scPace.teamAvgCapacity.size > 0 ||
            scPace.teamAvgCapacity.price > 0
              ? scPace.teamAvgCapacity
              : null;

          return (
            <tr
              key={sc.servCodeId}
              className={cn("transition-colors", isRowHovered && "bg-primary/5")}
              onMouseEnter={() => onHoverServCode(sc.servCodeId)}
              onMouseLeave={() => onHoverServCode(null)}
            >
              {/* ServCode label cell */}
              <td
                className={cn(
                  "border border-border px-2 py-1 pl-7 sticky left-0 z-10 transition-colors",
                  isRowHovered ? "bg-primary/5" : "bg-card",
                )}
              >
                <div className="flex items-center gap-2 group">
                  {/* servCodeId */}
                  <span
                    className={cn(
                      "font-mono text-foreground",
                      isRowHovered && "font-semibold",
                    )}
                  >
                    {sc.servCodeId}
                  </span>
                  {/* Stacked date range */}
                  {sc.dateRange.min && (
                    <div className="flex flex-col leading-none text-[10px] text-muted-foreground">
                      <span>{formatDate(sc.dateRange.min)}</span>
                      <span>{formatDate(sc.dateRange.max)}</span>
                    </div>
                  )}
                  {/* Avg CSP */}
                  {scAvgCapacity !== null && <CspDisplay csp={scAvgCapacity} />}
                  {/* Edit trigger — visible on row hover */}
                  <MiniServCodeControls servCode={sc}>
                    <Pencil className="w-3 h-3 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </MiniServCodeControls>
                </div>
              </td>

              {selectedEmployees.map((employee) => {
                const assignedSet = getAssignedSet(employee);
                const isColHovered = hoveredEmployeeId === employee.employeeId;
                const isBothHovered = isRowHovered && isColHovered;

                return (
                  <td
                    key={employee.employeeId}
                    className={cn(
                      "border border-border px-2 py-1 text-center transition-colors",
                      isBothHovered
                        ? "bg-primary/20"
                        : isRowHovered
                          ? "bg-primary/5"
                          : isColHovered
                            ? "bg-primary/10"
                            : "",
                    )}
                    onMouseEnter={() => onHoverEmployee(employee.employeeId)}
                    onMouseLeave={() => onHoverEmployee(null)}
                  >
                    <input
                      type="checkbox"
                      checked={assignedSet.has(sc.servCodeId)}
                      onChange={() => toggleServCodeForEmployee(employee, sc.servCodeId)}
                      className="accent-primary cursor-pointer"
                      aria-label={`Assign ${sc.servCodeId} to ${employee.name}`}
                    />
                  </td>
                );
              })}
            </tr>
          );
        })}
    </>
  );
}
