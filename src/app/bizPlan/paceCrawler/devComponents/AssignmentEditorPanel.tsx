"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { assignmentPlanActions } from "@/app/bizPlan/assignmentPlan/assignmentPlanSlice";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { ChevronUp, ChevronDown, X, Plus } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConfigGroup = {
  fingerprint: string;
  employeeIds: string[];
  servCodeIds: string[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildConfigGroups(
  selectedEmployeeIds: Set<string>,
  assignmentsByEmployeeId: Map<string, { servCodeIds: string[] }>,
): ConfigGroup[] {
  const groupMap = new Map<string, ConfigGroup>();

  for (const employeeId of selectedEmployeeIds) {
    const plan = assignmentsByEmployeeId.get(employeeId);
    const servCodeIds = plan?.servCodeIds ?? [];
    const fingerprint = servCodeIds.join(",");

    const existing = groupMap.get(fingerprint);
    if (existing) {
      existing.employeeIds.push(employeeId);
    } else {
      groupMap.set(fingerprint, {
        fingerprint,
        employeeIds: [employeeId],
        servCodeIds: [...servCodeIds],
      });
    }
  }

  return [...groupMap.values()];
}

// ---------------------------------------------------------------------------
// AssignmentEditorPanel
// ---------------------------------------------------------------------------

export function AssignmentEditorPanel() {
  const dispatch = useAppDispatch();
  const { upsert } = useAssignmentPlan({ autoLoad: false });

  const assignmentPlans = useSelector(assignmentPlanSelect.assignmentPlans);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const allServCodes = useSelector(progServSelect.servCodes);

  const activeEmployees = [...employeeMap.values()].filter((e) => e.active);

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  function toggleEmployee(employeeId: string) {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  }

  function selectAssigned() {
    const assignedIds = new Set(
      activeEmployees
        .filter((e) => (assignmentsByEmployeeId.get(e.employeeId)?.servCodeIds.length ?? 0) > 0)
        .map((e) => e.employeeId),
    );
    setSelectedEmployeeIds(assignedIds);
  }

  function clearAll() {
    setSelectedEmployeeIds(new Set());
  }

  // Dispatch reorder for all employees in a group
  function applyToGroup(employeeIds: string[], newServCodeIds: string[]) {
    for (const employeeId of employeeIds) {
      dispatch(assignmentPlanActions.reorderServCodes({ employeeId, servCodeIds: newServCodeIds }));
      upsert({ employeeId, servCodeIds: newServCodeIds });
    }
  }

  function moveUp(group: ConfigGroup, index: number) {
    if (index === 0) return;
    const newIds = [...group.servCodeIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    applyToGroup(group.employeeIds, newIds);
  }

  function moveDown(group: ConfigGroup, index: number) {
    if (index === group.servCodeIds.length - 1) return;
    const newIds = [...group.servCodeIds];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    applyToGroup(group.employeeIds, newIds);
  }

  function remove(group: ConfigGroup, servCodeId: string) {
    const newIds = group.servCodeIds.filter((id) => id !== servCodeId);
    applyToGroup(group.employeeIds, newIds);
  }

  function addServCode(group: ConfigGroup, servCodeId: string) {
    if (group.servCodeIds.includes(servCodeId)) return;
    const newIds = [...group.servCodeIds, servCodeId];
    applyToGroup(group.employeeIds, newIds);
  }

  const configGroups = buildConfigGroups(selectedEmployeeIds, assignmentsByEmployeeId);

  // All servCode IDs for the "Add" dropdown
  const allServCodeIds = allServCodes.map((sc) => sc.servCodeId).sort();

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — employee selector */}
      <div className="w-48 shrink-0 border-r flex flex-col bg-card">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Employees</span>
          <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:underline">Clear</button>
        </div>
        <div className="px-3 py-1.5 border-b">
          <button
            onClick={selectAssigned}
            className="text-[10px] bg-accent/20 hover:bg-accent/30 rounded px-1.5 py-0.5 transition-colors w-full text-left"
          >
            Select Assigned
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {activeEmployees.map((employee) => {
            const assignedCount = assignmentsByEmployeeId.get(employee.employeeId)?.servCodeIds.length ?? 0;
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
                  <span className="text-[10px] text-muted-foreground shrink-0">{assignedCount}</span>
                )}
              </label>
            );
          })}
        </div>
        <div className="px-3 py-2 border-t text-[10px] text-muted-foreground">
          {assignmentPlans.length} plans loaded
        </div>
      </div>

      {/* Right panel — config groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {selectedEmployeeIds.size === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Select employees from the left panel to edit their assignments.
          </p>
        )}

        {configGroups.map((group) => {
          const employeeNames = group.employeeIds
            .map((id) => employeeMap.get(id)?.name ?? id)
            .join(", ");

          const availableToAdd = allServCodeIds.filter((id) => !group.servCodeIds.includes(id));

          return (
            <div key={group.fingerprint} className="border border-border rounded overflow-hidden">
              {/* Group header */}
              <div className="px-3 py-2 bg-accent/10 border-b border-border">
                <p className="text-xs font-semibold text-foreground">
                  {group.employeeIds.length > 1
                    ? `${group.employeeIds.length} employees — same config`
                    : "1 employee"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{employeeNames}</p>
              </div>

              {/* Priority list */}
              <div className="divide-y divide-border/50">
                {group.servCodeIds.length === 0 && (
                  <p className="px-3 py-2 text-[10px] text-muted-foreground">No servCodes assigned.</p>
                )}
                {group.servCodeIds.map((servCodeId, index) => (
                  <div
                    key={servCodeId}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/5 text-xs"
                  >
                    <span className="text-[10px] text-muted-foreground w-5 text-right shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-mono text-foreground flex-1">{servCodeId}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => moveUp(group, index)}
                        disabled={index === 0}
                        className="p-0.5 rounded hover:bg-accent/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveDown(group, index)}
                        disabled={index === group.servCodeIds.length - 1}
                        className="p-0.5 rounded hover:bg-accent/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => remove(group, servCodeId)}
                        className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add servCode */}
              {availableToAdd.length > 0 && (
                <div className="px-3 py-2 border-t border-border/50 bg-card">
                  <div className="flex items-center gap-2">
                    <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                    <select
                      className="flex-1 text-xs bg-card border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addServCode(group, e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="" disabled>Add servCode…</option>
                      {availableToAdd.map((id) => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
