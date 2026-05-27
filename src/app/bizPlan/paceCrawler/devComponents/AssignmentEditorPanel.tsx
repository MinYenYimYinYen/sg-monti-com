"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { assignmentPlanActions } from "@/app/bizPlan/assignmentPlan/assignmentPlanSlice";
import { flattenEntries, AssignmentEntry } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { ChevronUp, ChevronDown, ChevronRight, X, Plus, Copy, ClipboardPaste } from "lucide-react";
import { Button } from "@/style/components/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConfigGroup = {
  fingerprint: string;
  employeeIds: string[];
  entries: AssignmentEntry[];
};

type SelectionAction =
  | { kind: "makeGroup"; indices: number[] }
  | { kind: "breakGroup"; index: number }
  | { kind: "addToGroup"; groupIndex: number; singleIndices: number[] }
  | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildConfigGroups(
  selectedEmployeeIds: Set<string>,
  assignmentsByEmployeeId: ReturnType<typeof assignmentPlanSelect.assignmentsByEmployeeId>,
): ConfigGroup[] {
  const groupMap = new Map<string, ConfigGroup>();

  for (const employeeId of selectedEmployeeIds) {
    const entries = assignmentsByEmployeeId.get(employeeId)?.entries ?? [];
    // Each employee gets its own group card (fingerprint includes employeeId)
    const fingerprint = flattenEntries(entries).join(",") + "|" + employeeId;

    groupMap.set(fingerprint, {
      fingerprint,
      employeeIds: [employeeId],
      entries: [...entries],
    });
  }

  return [...groupMap.values()];
}

/** Determine what action is available given the current selection. */
function resolveSelectionAction(
  entries: AssignmentEntry[],
  selectedIndices: Set<number>,
): SelectionAction {
  if (selectedIndices.size === 0) return null;

  const indices = [...selectedIndices].sort((a, b) => a - b);
  const groupIndices = indices.filter((i) => entries[i]?.kind === "group");
  const singleIndices = indices.filter((i) => entries[i]?.kind === "single");

  if (groupIndices.length > 1) return null; // ambiguous
  if (groupIndices.length === 1 && singleIndices.length === 0) {
    return { kind: "breakGroup", index: groupIndices[0] };
  }
  if (groupIndices.length === 1 && singleIndices.length > 0) {
    return { kind: "addToGroup", groupIndex: groupIndices[0], singleIndices };
  }
  if (groupIndices.length === 0 && singleIndices.length >= 2) {
    return { kind: "makeGroup", indices: singleIndices };
  }
  return null; // single selection with no group — no action
}

/** Format an ISO date string as MM/DD. */
function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

// ---------------------------------------------------------------------------
// ProgCodeServCodePopover — detail popover for selecting individual servCodes
// ---------------------------------------------------------------------------

type ProgCodeServCodePopoverProps = {
  progCodeId: string;
  availableServCodeIds: string[];
  pendingIds: Set<string>;
  onToggle: (servCodeId: string) => void;
};

function ProgCodeServCodePopover({
  progCodeId,
  availableServCodeIds,
  pendingIds,
  onToggle,
}: ProgCodeServCodePopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="font-mono text-[10px] text-primary hover:underline transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {progCodeId}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
          {progCodeId} — select servCodes
        </p>
        <div className="space-y-0.5">
          {availableServCodeIds.map((servCodeId) => (
            <label
              key={servCodeId}
              className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-accent/10 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={pendingIds.has(servCodeId)}
                onChange={() => onToggle(servCodeId)}
                className="accent-primary"
              />
              <span className="font-mono text-xs text-foreground">{servCodeId}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// AddServCodesSection — progCode-based multi-select picker
// ---------------------------------------------------------------------------

type AddServCodesSectionProps = {
  groupFingerprint: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  existingIds: Set<string>;
  pendingIds: Set<string>;
  onToggleServCode: (servCodeId: string) => void;
  onToggleProgCode: (servCodeIds: string[]) => void;
  onConfirm: () => void;
};

function AddServCodesSection({
  isOpen,
  onToggleOpen,
  existingIds,
  pendingIds,
  onToggleServCode,
  onToggleProgCode,
  onConfirm,
}: AddServCodesSectionProps) {
  const progCodes = useSelector(progServSelect.progCodes);

  const availableProgCodes = progCodes
    .map((progCode) => {
      const availableServCodeIds = progCode.servCodes
        .map((sc) => sc.servCodeId)
        .filter((id) => !existingIds.has(id));
      return { progCodeId: progCode.progCodeId, availableServCodeIds };
    })
    .filter((p) => p.availableServCodeIds.length > 0);

  if (availableProgCodes.length === 0) return null;

  return (
    <div className="border-t border-border/50 bg-card">
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors text-left"
      >
        {isOpen
          ? <ChevronRight className="w-3 h-3 rotate-90 transition-transform" />
          : <Plus className="w-3 h-3" />
        }
        <span>Add servCodes</span>
        {pendingIds.size > 0 && (
          <span className="ml-auto text-primary font-semibold">{pendingIds.size} selected</span>
        )}
      </button>

      {isOpen && (
        <div className="px-3 pb-2 space-y-2">
          <div className="grid grid-cols-3 gap-1">
            {availableProgCodes.map(({ progCodeId, availableServCodeIds }) => {
              const pendingCount = availableServCodeIds.filter((id) => pendingIds.has(id)).length;
              const allPending = pendingCount === availableServCodeIds.length;
              const somePending = pendingCount > 0 && !allPending;

              return (
                <div
                  key={progCodeId}
                  className="flex items-center gap-1 px-1.5 py-1 rounded border border-border/50 bg-background hover:bg-accent/5 text-[10px]"
                >
                  <input
                    type="checkbox"
                    checked={allPending}
                    ref={(el) => {
                      if (el) el.indeterminate = somePending;
                    }}
                    onChange={() => onToggleProgCode(availableServCodeIds)}
                    className="accent-primary shrink-0"
                    title={`Toggle all ${progCodeId} servCodes`}
                  />
                  <ProgCodeServCodePopover
                    progCodeId={progCodeId}
                    availableServCodeIds={availableServCodeIds}
                    pendingIds={pendingIds}
                    onToggle={onToggleServCode}
                  />
                </div>
              );
            })}
          </div>

          {pendingIds.size > 0 && (
            <Button
              size="sm"
              variant="primary"
              intensity="solid"
              onClick={onConfirm}
              className="h-6 text-[10px] w-full"
            >
              Add {pendingIds.size} selected
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AssignmentEditorPanel
// ---------------------------------------------------------------------------

export function AssignmentEditorPanel() {
  const dispatch = useAppDispatch();

  const assignmentPlans = useSelector(assignmentPlanSelect.assignmentPlans);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const servCodeMap = useSelector(progServSelect.servCodeMap);

  const activeEmployees = [...employeeMap.values()].filter((e) => e.active);

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [pendingByGroup, setPendingByGroup] = useState<Map<string, Set<string>>>(new Map());
  const [openAddGroup, setOpenAddGroup] = useState<string | null>(null);
  const [selectedByGroup, setSelectedByGroup] = useState<Map<string, Set<number>>>(new Map());
  const [clipboard, setClipboard] = useState<{ entries: AssignmentEntry[]; sourceFingerprint: string } | null>(null);
  const [pendingPasteGroup, setPendingPasteGroup] = useState<string | null>(null);

  /** Returns "MM/DD–MM/DD" for a single servCode, or null if no valid dateRange. */
  function getServCodeDateRange(servCodeId: string): string | null {
    const sc = servCodeMap.get(servCodeId);
    if (!sc) return null;
    const min = fmtDate(sc.dateRange.min);
    const max = fmtDate(sc.dateRange.max);
    if (!min && !max) return null;
    if (min && max) return `${min}–${max}`;
    return min ?? max ?? null;
  }

  /** Returns "MM/DD–MM/DD" for a group (earliest min, latest max across members). */
  function getGroupDateRange(servCodeIds: string[]): string | null {
    const mins: string[] = [];
    const maxes: string[] = [];
    for (const id of servCodeIds) {
      const sc = servCodeMap.get(id);
      if (sc?.dateRange.min) mins.push(sc.dateRange.min);
      if (sc?.dateRange.max) maxes.push(sc.dateRange.max);
    }
    const minDate = mins.length > 0 ? fmtDate([...mins].sort()[0]) : null;
    const maxDate = maxes.length > 0 ? fmtDate([...maxes].sort().at(-1)) : null;
    if (!minDate && !maxDate) return null;
    if (minDate && maxDate) return `${minDate}–${maxDate}`;
    return minDate ?? maxDate ?? null;
  }

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
        .filter((e) => {
          const plan = assignmentsByEmployeeId.get(e.employeeId);
          return plan ? flattenEntries(plan.entries).length > 0 : false;
        })
        .map((e) => e.employeeId),
    );
    setSelectedEmployeeIds(assignedIds);
  }

  function clearAll() {
    setSelectedEmployeeIds(new Set());
  }

  // All edits update Redux only (local). Persisting happens via Save/Save As in the toolbar.
  function applyToGroup(employeeIds: string[], newEntries: AssignmentEntry[]) {
    for (const employeeId of employeeIds) {
      dispatch(assignmentPlanActions.reorderEntries({ employeeId, entries: newEntries }));
    }
  }

  function moveUp(group: ConfigGroup, index: number, e: React.MouseEvent<HTMLButtonElement>) {
    if (index === 0) return;
    const newEntries = [...group.entries];
    [newEntries[index - 1], newEntries[index]] = [newEntries[index], newEntries[index - 1]];
    applyToGroup(group.employeeIds, newEntries);
    setSelectedByGroup((prev) => {
      const next = new Map(prev);
      const sel = new Set(next.get(group.fingerprint) ?? []);
      if (sel.has(index)) {
        sel.delete(index);
        sel.add(index - 1);
        next.set(group.fingerprint, sel);
      }
      return next;
    });
    (e.currentTarget as HTMLButtonElement).focus();
  }

  function moveDown(group: ConfigGroup, index: number, e: React.MouseEvent<HTMLButtonElement>) {
    if (index === group.entries.length - 1) return;
    const newEntries = [...group.entries];
    [newEntries[index], newEntries[index + 1]] = [newEntries[index + 1], newEntries[index]];
    applyToGroup(group.employeeIds, newEntries);
    setSelectedByGroup((prev) => {
      const next = new Map(prev);
      const sel = new Set(next.get(group.fingerprint) ?? []);
      if (sel.has(index)) {
        sel.delete(index);
        sel.add(index + 1);
        next.set(group.fingerprint, sel);
      }
      return next;
    });
    (e.currentTarget as HTMLButtonElement).focus();
  }

  function moveSelectedUp(group: ConfigGroup, selectedIndices: Set<number>, e: React.MouseEvent<HTMLButtonElement>) {
    const sorted = [...selectedIndices].sort((a, b) => a - b);
    const minIdx = sorted[0];
    if (minIdx === 0) return;

    const entries = group.entries;
    const isContiguous = sorted[sorted.length - 1] - minIdx + 1 === sorted.length;

    let newEntries: AssignmentEntry[];
    let newSelectedIndices: Set<number>;

    if (!isContiguous) {
      const selectedSet = new Set(sorted);
      const selectedItems = sorted.map((i) => entries[i]);
      const nonSelected = entries.filter((_, i) => !selectedSet.has(i));
      newEntries = [
        ...nonSelected.slice(0, minIdx),
        ...selectedItems,
        ...nonSelected.slice(minIdx),
      ];
      newSelectedIndices = new Set(sorted.map((_, i) => minIdx + i));
    } else {
      const selectedSet = new Set(sorted);
      newEntries = [...entries];
      const above = minIdx - 1;
      const aboveEntry = newEntries[above];
      for (let i = above; i < above + sorted.length; i++) {
        newEntries[i] = newEntries[i + 1];
      }
      newEntries[above + sorted.length] = aboveEntry;
      newSelectedIndices = new Set(sorted.map((i) => i - 1));
    }

    applyToGroup(group.employeeIds, newEntries);
    setSelectedByGroup((prev) => {
      const next = new Map(prev);
      next.set(group.fingerprint, newSelectedIndices);
      return next;
    });
    (e.currentTarget as HTMLButtonElement).focus();
  }

  function moveSelectedDown(group: ConfigGroup, selectedIndices: Set<number>, e: React.MouseEvent<HTMLButtonElement>) {
    const sorted = [...selectedIndices].sort((a, b) => a - b);
    const maxIdx = sorted[sorted.length - 1];
    if (maxIdx === group.entries.length - 1) return;

    const entries = group.entries;
    const isContiguous = maxIdx - sorted[0] + 1 === sorted.length;

    let newEntries: AssignmentEntry[];
    let newSelectedIndices: Set<number>;

    if (!isContiguous) {
      const selectedSet = new Set(sorted);
      const selectedItems = sorted.map((i) => entries[i]);
      const nonSelected = entries.filter((_, i) => !selectedSet.has(i));
      const selectedBeforeMax = sorted.filter((i) => i <= maxIdx).length;
      const insertAt = maxIdx - selectedBeforeMax + 1;
      newEntries = [
        ...nonSelected.slice(0, insertAt),
        ...selectedItems,
        ...nonSelected.slice(insertAt),
      ];
      newSelectedIndices = new Set(sorted.map((_, i) => insertAt + i));
    } else {
      const minIdx = sorted[0];
      newEntries = [...entries];
      const below = maxIdx + 1;
      const belowEntry = newEntries[below];
      for (let i = below; i > minIdx; i--) {
        newEntries[i] = newEntries[i - 1];
      }
      newEntries[minIdx] = belowEntry;
      newSelectedIndices = new Set(sorted.map((i) => i + 1));
    }

    applyToGroup(group.employeeIds, newEntries);
    setSelectedByGroup((prev) => {
      const next = new Map(prev);
      next.set(group.fingerprint, newSelectedIndices);
      return next;
    });
    (e.currentTarget as HTMLButtonElement).focus();
  }

  function remove(group: ConfigGroup, index: number) {
    const newEntries = group.entries.filter((_, i) => i !== index);
    applyToGroup(group.employeeIds, newEntries);
    setSelectedByGroup((prev) => {
      const next = new Map(prev);
      next.delete(group.fingerprint);
      return next;
    });
  }

  function toggleEntrySelection(fingerprint: string, index: number) {
    setSelectedByGroup((prev) => {
      const next = new Map(prev);
      const sel = new Set(next.get(fingerprint) ?? []);
      if (sel.has(index)) sel.delete(index);
      else sel.add(index);
      next.set(fingerprint, sel);
      return next;
    });
  }

  function clearGroupSelection(fingerprint: string) {
    setSelectedByGroup((prev) => {
      const next = new Map(prev);
      next.delete(fingerprint);
      return next;
    });
  }

  function executeSelectionAction(group: ConfigGroup, action: SelectionAction) {
    if (!action) return;
    const entries = group.entries;

    if (action.kind === "makeGroup") {
      const selectedServCodeIds = action.indices.flatMap((i) => {
        const entry = entries[i];
        return entry.kind === "single" ? [entry.servCodeId] : entry.servCodeIds;
      });
      const firstIndex = action.indices[0];
      const newEntries: AssignmentEntry[] = [];
      const selectedSet = new Set(action.indices);
      for (let i = 0; i < entries.length; i++) {
        if (i === firstIndex) {
          newEntries.push({ kind: "group", servCodeIds: selectedServCodeIds });
        } else if (!selectedSet.has(i)) {
          newEntries.push(entries[i]);
        }
      }
      applyToGroup(group.employeeIds, newEntries);
    } else if (action.kind === "breakGroup") {
      const groupEntry = entries[action.index];
      if (groupEntry.kind !== "group") return;
      const newEntries: AssignmentEntry[] = [];
      for (let i = 0; i < entries.length; i++) {
        if (i === action.index) {
          for (const id of groupEntry.servCodeIds) {
            newEntries.push({ kind: "single", servCodeId: id });
          }
        } else {
          newEntries.push(entries[i]);
        }
      }
      applyToGroup(group.employeeIds, newEntries);
    } else if (action.kind === "addToGroup") {
      const groupEntry = entries[action.groupIndex];
      if (groupEntry.kind !== "group") return;
      const addedIds = action.singleIndices.flatMap((i) => {
        const entry = entries[i];
        return entry.kind === "single" ? [entry.servCodeId] : [];
      });
      const newGroupEntry: AssignmentEntry = {
        kind: "group",
        servCodeIds: [...groupEntry.servCodeIds, ...addedIds],
      };
      const removeSet = new Set(action.singleIndices);
      const newEntries: AssignmentEntry[] = entries.map((entry, i) => {
        if (i === action.groupIndex) return newGroupEntry;
        return entry;
      }).filter((_, i) => !removeSet.has(i));
      applyToGroup(group.employeeIds, newEntries);
    }

    clearGroupSelection(group.fingerprint);
  }

  function getPending(fingerprint: string): Set<string> {
    return pendingByGroup.get(fingerprint) ?? new Set();
  }

  function toggleServCode(fingerprint: string, servCodeId: string) {
    setPendingByGroup((prev) => {
      const next = new Map(prev);
      const pending = new Set(next.get(fingerprint) ?? []);
      if (pending.has(servCodeId)) pending.delete(servCodeId);
      else pending.add(servCodeId);
      next.set(fingerprint, pending);
      return next;
    });
  }

  function toggleProgCode(fingerprint: string, availableServCodeIds: string[]) {
    setPendingByGroup((prev) => {
      const next = new Map(prev);
      const pending = new Set(next.get(fingerprint) ?? []);
      const allPending = availableServCodeIds.every((id) => pending.has(id));
      if (allPending) {
        for (const id of availableServCodeIds) pending.delete(id);
      } else {
        for (const id of availableServCodeIds) pending.add(id);
      }
      next.set(fingerprint, pending);
      return next;
    });
  }

  function confirmAdd(group: ConfigGroup) {
    const pending = getPending(group.fingerprint);
    if (pending.size === 0) return;
    const existingIds = new Set(flattenEntries(group.entries));
    const toAdd = [...pending].filter((id) => !existingIds.has(id));
    const newEntries: AssignmentEntry[] = [
      ...group.entries,
      ...toAdd.map((id) => ({ kind: "single" as const, servCodeId: id })),
    ];
    applyToGroup(group.employeeIds, newEntries);
    setPendingByGroup((prev) => {
      const next = new Map(prev);
      next.delete(group.fingerprint);
      return next;
    });
  }

  const configGroups = buildConfigGroups(selectedEmployeeIds, assignmentsByEmployeeId);

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
            const plan = assignmentsByEmployeeId.get(employee.employeeId);
            const assignedCount = plan ? flattenEntries(plan.entries).length : 0;
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

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Config groups scroll area */}
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

            const existingIds = new Set(flattenEntries(group.entries));
            const pending = getPending(group.fingerprint);
            const selectedIndices = selectedByGroup.get(group.fingerprint) ?? new Set<number>();
            const action = resolveSelectionAction(group.entries, selectedIndices);

            return (
              <div key={group.fingerprint} className="border border-border rounded overflow-hidden">
                {/* Group header */}
                <div className="px-3 py-2 bg-accent/10 border-b border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        {group.employeeIds.length > 1
                          ? `${group.employeeIds.length} employees — same config`
                          : "1 employee"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{employeeNames}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Selection action button */}
                      {action && (
                        <button
                          onClick={() => executeSelectionAction(group, action)}
                          className={`text-[10px] rounded px-2 py-0.5 transition-colors font-semibold ${
                            action.kind === "breakGroup"
                              ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                              : "bg-primary/20 text-primary hover:bg-primary/30"
                          }`}
                        >
                          {action.kind === "makeGroup" && `Make Group (${action.indices.length})`}
                          {action.kind === "breakGroup" && "Break Group"}
                          {action.kind === "addToGroup" && `Add to Group (+${action.singleIndices.length})`}
                        </button>
                      )}
                      {/* Copy button */}
                      <button
                        onClick={() => {
                          setClipboard({ entries: [...group.entries], sourceFingerprint: group.fingerprint });
                          setPendingPasteGroup(null);
                        }}
                        disabled={group.entries.length === 0}
                        className={`p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                          clipboard?.sourceFingerprint === group.fingerprint
                            ? "text-accent bg-accent/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                        }`}
                        title="Copy config"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {/* Paste button — shown on non-source groups when clipboard is set */}
                      {clipboard && clipboard.sourceFingerprint !== group.fingerprint && (
                        <button
                          onClick={() => setPendingPasteGroup(
                            pendingPasteGroup === group.fingerprint ? null : group.fingerprint
                          )}
                          className="p-1 rounded text-primary hover:bg-primary/10 transition-colors"
                          title="Paste config"
                        >
                          <ClipboardPaste className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Paste confirmation row */}
                  {pendingPasteGroup === group.fingerprint && (
                    <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                      <span className="text-muted-foreground">Overwrite this config?</span>
                      <button
                        onClick={() => {
                          if (!clipboard) return;
                          applyToGroup(group.employeeIds, clipboard.entries);
                          setClipboard(null);
                          setPendingPasteGroup(null);
                        }}
                        className="text-primary font-semibold hover:underline"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setPendingPasteGroup(null)}
                        className="text-muted-foreground hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Priority list */}
                <div className="divide-y divide-border/50">
                  {group.entries.length === 0 && (
                    <p className="px-3 py-2 text-[10px] text-muted-foreground">No servCodes assigned.</p>
                  )}
                  {group.entries.map((entry, index) => {
                    const label = entry.kind === "single"
                      ? entry.servCodeId
                      : entry.servCodeIds.join(" + ");
                    const dateRange = entry.kind === "single"
                      ? getServCodeDateRange(entry.servCodeId)
                      : getGroupDateRange(entry.servCodeIds);
                    const isSelected = selectedIndices.has(index);
                    const multiSelect = selectedIndices.size >= 2;
                    const sortedSelected = [...selectedIndices].sort((a, b) => a - b);
                    const isTopSelected = multiSelect && sortedSelected[0] === index;
                    const isBottomSelected = multiSelect && sortedSelected[sortedSelected.length - 1] === index;
                    const canMoveUp = sortedSelected[0] > 0;
                    const canMoveDown = sortedSelected[sortedSelected.length - 1] < group.entries.length - 1;

                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-1.5 px-2 py-1.5 text-xs ${isSelected ? "bg-primary/5" : "hover:bg-accent/5"}`}
                      >
                        {/* Selection checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEntrySelection(group.fingerprint, index)}
                          className="accent-primary shrink-0"
                        />
                        {/* Position number */}
                        <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">
                          {index + 1}
                        </span>
                        {/* ↑↓ buttons — left of label */}
                        <div className="flex items-center gap-0 shrink-0">
                          {multiSelect && isTopSelected ? (
                            <button
                              onClick={(e) => moveSelectedUp(group, selectedIndices, e)}
                              disabled={!canMoveUp}
                              className="p-0.5 rounded hover:bg-accent/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
                              title="Move selection up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          ) : multiSelect && isBottomSelected ? (
                            <button
                              onClick={(e) => moveSelectedDown(group, selectedIndices, e)}
                              disabled={!canMoveDown}
                              className="p-0.5 rounded hover:bg-accent/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
                              title="Move selection down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          ) : multiSelect && isSelected ? (
                            <span className="w-[14px] shrink-0" />
                          ) : !multiSelect ? (
                            <>
                              <button
                                onClick={(e) => moveUp(group, index, e)}
                                disabled={index === 0}
                                className="p-0.5 rounded hover:bg-accent/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
                                title="Move up"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => moveDown(group, index, e)}
                                disabled={index === group.entries.length - 1}
                                className="p-0.5 rounded hover:bg-accent/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
                                title="Move down"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <span className="w-[14px] shrink-0" />
                          )}
                        </div>
                        {/* Label + date range */}
                        <span className={`font-mono ${entry.kind === "group" ? "text-primary" : "text-foreground"}`}>
                          {label}
                        </span>
                        {dateRange && (
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                            ({dateRange})
                          </span>
                        )}
                        {entry.kind === "group" && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className="text-[9px] text-primary shrink-0 bg-primary/10 hover:bg-primary/20 rounded px-1 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                group
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2" align="start">
                              <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                                Member date ranges
                              </p>
                              <div className="space-y-0.5">
                                {entry.servCodeIds.map((servCodeId) => {
                                  const range = getServCodeDateRange(servCodeId);
                                  return (
                                    <div key={servCodeId} className="flex items-center gap-1 text-[10px]">
                                      <span className="font-mono text-foreground flex-1">{servCodeId}</span>
                                      <span className="font-mono text-muted-foreground">{range ?? "—"}</span>
                                      <button
                                        onClick={() => {
                                          const remaining = entry.servCodeIds.filter((id) => id !== servCodeId);
                                          const updatedGroupEntry: AssignmentEntry =
                                            remaining.length === 1
                                              ? { kind: "single", servCodeId: remaining[0] }
                                              : { kind: "group", servCodeIds: remaining, label: entry.label };
                                          const ejectedEntry: AssignmentEntry = { kind: "single", servCodeId };
                                          const newEntries: AssignmentEntry[] = [
                                            ...group.entries.slice(0, index),
                                            updatedGroupEntry,
                                            ejectedEntry,
                                            ...group.entries.slice(index + 1),
                                          ];
                                          applyToGroup(group.employeeIds, newEntries);
                                        }}
                                        className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                        title={`Remove ${servCodeId} from group`}
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                        {/* Spacer to push remove button to the right */}
                        <span className="flex-1" />
                        {/* Remove button */}
                        <button
                          onClick={() => remove(group, index)}
                          className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add servCodes — progCode picker */}
                <AddServCodesSection
                  groupFingerprint={group.fingerprint}
                  isOpen={openAddGroup === group.fingerprint}
                  onToggleOpen={() => setOpenAddGroup(
                    openAddGroup === group.fingerprint ? null : group.fingerprint
                  )}
                  existingIds={existingIds}
                  pendingIds={pending}
                  onToggleServCode={(id) => toggleServCode(group.fingerprint, id)}
                  onToggleProgCode={(ids) => toggleProgCode(group.fingerprint, ids)}
                  onConfirm={() => {
                    confirmAdd(group);
                    setOpenAddGroup(null);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
