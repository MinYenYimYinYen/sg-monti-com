"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { usePaceDeps } from "@/app/bizPlan/pace/usePaceDeps";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { rawPaceSelect } from "@/app/bizPlan/pace/rawPaceSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { assignmentPlanActions } from "@/app/bizPlan/assignmentPlan/assignmentPlanSlice";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { ProgCodePace, ServCodePace, ServCodePaceDelta } from "@/app/bizPlan/pace/PaceType";
import { MiniServCodeControls } from "@/app/bizPlan/pace/employee/components/MiniServCodeControls";
import { Number } from "@/components/Number";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { CountSizePrice } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { MatrixDisplaySettings } from "@/app/bizPlan/assignmentPlan/matrix/MatrixDisplaySettings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

// Deltas within ±ON_PACE_THRESHOLD_DAYS are considered "on pace" (green).
// Beyond that: positive = behind (red), negative = ahead (blue).
const ON_PACE_THRESHOLD_DAYS = 2;

function deltaDaysColor(deltaDays: number): string {
  if (deltaDays > ON_PACE_THRESHOLD_DAYS) return "text-destructive";
  if (deltaDays < -ON_PACE_THRESHOLD_DAYS) return "text-primary";
  return "text-accent";
}

function formatDeltaDays(deltaDays: number): string {
  return deltaDays > 0 ? `+${deltaDays}d` : `${deltaDays}d`;
}

// ---------------------------------------------------------------------------
// DeltaDaysDisplay — single servCode delta badge
// ---------------------------------------------------------------------------

function DeltaDaysDisplay({ deltaDays }: { deltaDays: number | null }) {
  if (deltaDays == null) return null;
  return (
    <span className={`text-[10px] font-mono ${deltaDaysColor(deltaDays)}`}>
      {formatDeltaDays(deltaDays)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ProgDeltaDisplay — shows min/max delta range for a progCode
// ---------------------------------------------------------------------------

function ProgDeltaDisplay({ deltas }: { deltas: (number | null)[] }) {
  const valid = deltas.filter((d): d is number => d != null);
  if (valid.length === 0) return null;

  const minDelta = Math.min(...valid);
  const maxDelta = Math.max(...valid);

  if (minDelta === maxDelta) {
    return <DeltaDaysDisplay deltaDays={minDelta} />;
  }

  return (
    <span className="flex items-center gap-0.5 text-[10px] font-mono">
      <span className={deltaDaysColor(maxDelta)}>{formatDeltaDays(maxDelta)}</span>
      <span className="text-muted-foreground">/</span>
      <span className={deltaDaysColor(minDelta)}>{formatDeltaDays(minDelta)}</span>
    </span>
  );
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

  const allEmployees = useSelector(employeeSelect.employees);
  const activeEmployees = allEmployees.filter((e) => e.active);

  const progCodePaces = useSelector(paceSelect.matrixFilteredSortedProgCodePaces);
  const cspDisplay = useSelector(paceSelect.matrixDisplayConfig).cspDisplay;

  // Raw CSP maps for display
  const perDayMap = useSelector(rawPaceSelect.rawServCodePacesPerDayMap);
  const perDayPerEmployeeMap = useSelector(rawPaceSelect.rawServCodePacesPerDayPerEmployeeMap);

  // Delta map for pace delta display
  const deltaMap = useSelector(paceSelect.servCodePaceDeltaMap);

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

  // Resolve the CSP to display for a servCode based on the current display mode
  function getServCodeCsp(servCodeId: string): CountSizePrice | null {
    if (cspDisplay === "perDay") {
      const pace = perDayMap.get(servCodeId);
      if (!pace) return null;
      const csp = pace.unfinishedPerDay;
      return csp.count > 0 || csp.size > 0 || csp.price > 0 ? csp : null;
    }
    if (cspDisplay === "perDayPerEmployee") {
      const pace = perDayPerEmployeeMap.get(servCodeId);
      if (!pace) return null;
      const csp = pace.unfinishedPerDayPerEmployee;
      return csp.count > 0 || csp.size > 0 || csp.price > 0 ? csp : null;
    }
    // "total"
    const pace = perDayMap.get(servCodeId);
    if (!pace) return null;
    const csp = pace.unfinishedCSP;
    return csp.count > 0 || csp.size > 0 || csp.price > 0 ? csp : null;
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
            className="text-[10px] bg-accent/20 hover:bg-accent/30 rounded px-1.5 py-0.5 transition-colors"
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
          <table className="border-separate border-spacing-0 text-xs w-max min-w-full">
            {/* Header row: one column per selected employee */}
            <thead className="sticky top-0 z-10 bg-background">
              <tr>
                {/* Top-left corner cell — sticky on both axes */}
                <th className="border border-border px-3 py-1.5 text-left font-semibold text-foreground sticky left-0 z-20 min-w-56 bg-background">
                  <div className="flex items-center justify-between gap-2">
                    <span>Program / ServCode</span>
                    <MatrixDisplaySettings />
                  </div>
                </th>
                {selectedEmployees.map((employee) => {
                  const assignedCount =
                    assignmentsByEmployeeId.get(employee.employeeId)?.servCodeIds.length ?? 0;
                  return (
                    <th
                      key={employee.employeeId}
                      className="border border-border px-2 py-1.5 text-center bg-accent/10 whitespace-nowrap min-w-20"
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-semibold text-foreground">{employee.name}</span>
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
                    getServCodeCsp={getServCodeCsp}
                    deltaMap={deltaMap}
                    onToggleExpand={() => toggleProgExpand(progCodePace.progCode.progCodeId)}
                    onUpsert={handleUpsert}
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
  getServCodeCsp: (servCodeId: string) => CountSizePrice | null;
  deltaMap: Map<string, ServCodePaceDelta>;
  onToggleExpand: () => void;
  onUpsert: (employeeId: string, servCodeIds: string[]) => void;
};

function MatrixProgGroup({
  progCodePace,
  isExpanded,
  selectedEmployees,
  assignmentsByEmployeeId,
  getServCodeCsp,
  deltaMap,
  onToggleExpand,
  onUpsert,
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

  // Prog-level CSP: sum of all servCode CSPs using the current display mode
  const progCspValues = servCodePaces
    .map((sp) => getServCodeCsp(sp.servCode.servCodeId))
    .filter((csp): csp is CountSizePrice => csp !== null);
  const progCsp: CountSizePrice | null =
    progCspValues.length > 0
      ? {
          count: progCspValues.reduce((s, c) => s + c.count, 0),
          size: progCspValues.reduce((s, c) => s + c.size, 0),
          price: progCspValues.reduce((s, c) => s + c.price, 0),
          rev: progCspValues.reduce((s, c) => s + c.rev, 0),
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
      {/* Program header row — bg-accent/5 only on non-sticky cells to avoid double-tint on sticky */}
      <tr>
        <td className="border border-border px-2 py-1.5 sticky left-0 z-10 bg-card">
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
            {/* Prog-level CSP */}
            {progCsp !== null && <CspDisplay csp={progCsp} />}
            {/* Prog-level pace delta range */}
            <ProgDeltaDisplay
              deltas={servCodePaces.map(
                (sp) => deltaMap.get(sp.servCode.servCodeId)?.deltaDays ?? null,
              )}
            />
          </div>
        </td>

        {selectedEmployees.map((employee) => {
          const assignedSet = getAssignedSet(employee);
          const assignedCount = progServCodeIds.filter((id) => assignedSet.has(id)).length;
          const allAssigned = assignedCount === progServCodeIds.length;
          const someAssigned = assignedCount > 0 && !allAssigned;

          return (
            <td
              key={employee.employeeId}
              className="border border-border px-2 py-1.5 text-center bg-accent/5"
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
          const scCsp = getServCodeCsp(sc.servCodeId);

          return (
            <tr key={sc.servCodeId}>
              {/* ServCode label cell — sticky left, bg-card directly for opaque background */}
              <td className="border border-border px-2 py-1 pl-7 sticky left-0 z-10 bg-card">
                <div className="flex items-center gap-2 group">
                  <span className="font-mono text-foreground">{sc.servCodeId}</span>
                  {/* Stacked date range */}
                  {sc.dateRange.min && (
                    <div className="flex flex-col leading-none text-[10px] text-muted-foreground">
                      <span>{formatDate(sc.dateRange.min)}</span>
                      <span>{formatDate(sc.dateRange.max)}</span>
                    </div>
                  )}
                  {/* CSP from raw selectors */}
                  {scCsp !== null && <CspDisplay csp={scCsp} />}
                  {/* ServCode pace delta */}
                  <DeltaDaysDisplay
                    deltaDays={deltaMap.get(sc.servCodeId)?.deltaDays ?? null}
                  />
                  {/* Edit trigger — visible on row hover */}
                  <MiniServCodeControls servCode={sc}>
                    <Pencil className="w-3 h-3 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </MiniServCodeControls>
                </div>
              </td>

              {selectedEmployees.map((employee) => {
                const assignedSet = getAssignedSet(employee);

                return (
                  <td
                    key={employee.employeeId}
                    className="border border-border px-2 py-1 text-center"
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
