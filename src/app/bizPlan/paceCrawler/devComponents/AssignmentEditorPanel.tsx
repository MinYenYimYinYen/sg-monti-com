"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { assignmentGroupSelect } from "@/app/assignmentGroup/assignmentGroupSelect";
import { assignmentPlanActions } from "@/app/bizPlan/assignmentPlan/assignmentPlanSlice";
import { AssignmentEntry } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { paceCrawlerActions } from "@/app/bizPlan/paceCrawler/paceCrawlerSlice";
import { AssignmentGroupManager } from "@/app/assignmentGroup/_components/AssignmentGroupManager";
import { ChevronUp, ChevronDown, X, Plus, Copy, ClipboardPaste } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO date string as MM/DD. */
function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

// ---------------------------------------------------------------------------
// AddEntrySection — picker for adding singles or groups to an employee
// ---------------------------------------------------------------------------

type AddEntrySectionProps = {
  isOpen: boolean;
  onToggleOpen: () => void;
  existingGroupIds: Set<string>;
  onAddGroup: (groupId: string) => void;
};

function AddEntrySection({
  isOpen,
  onToggleOpen,
  existingGroupIds,
  onAddGroup,
}: AddEntrySectionProps) {
  const groups = useSelector(assignmentGroupSelect.groups);

  // Sort available groups alphabetically
  const availableGroups = [...groups]
    .filter((g) => !existingGroupIds.has(g.groupId))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (availableGroups.length === 0) return null;

  return (
    <div className="border-t border-border/50 bg-card">
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors text-left"
      >
        <Plus className="w-3 h-3" />
        <span>Add group</span>
      </button>

      {isOpen && (
        <div className="px-3 pb-2 space-y-0.5">
          {availableGroups.map((group) => (
            <button
              key={group.groupId}
              onClick={() => onAddGroup(group.groupId)}
              className="w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-primary/10 text-[10px] transition-colors"
            >
              <span className="font-mono text-primary font-semibold">{group.label}</span>
              <span className="text-[9px] text-primary bg-primary/10 rounded px-1">group</span>
              <span className="text-muted-foreground text-[9px]">
                ({group.servCodeIds.join(", ")})
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmployeeAssignmentCard — one card per selected employee
// ---------------------------------------------------------------------------

type EmployeeAssignmentCardProps = {
  employeeName: string;
  entries: AssignmentEntry[];
  onReorder: (entries: AssignmentEntry[]) => void;
};

function EmployeeAssignmentCard({
  employeeName,
  entries,
  onReorder,
}: EmployeeAssignmentCardProps) {
  const servCodeMap = useSelector(progServSelect.servCodeMap);
  const groupMap = useSelector(assignmentGroupSelect.groupMap);
  const [openAdd, setOpenAdd] = useState(false);

  const existingGroupIds = new Set(
    entries.filter((e) => e.kind === "group").map((e) => (e as { kind: "group"; groupId: string }).groupId),
  );

  function getEntryLabel(entry: AssignmentEntry): string {
    if (entry.kind === "single") return entry.servCodeId;
    const group = groupMap.get((entry as { kind: "group"; groupId: string }).groupId);
    return group?.label ?? (entry as { kind: "group"; groupId: string }).groupId;
  }

  function getEntryDateRange(entry: AssignmentEntry): string | null {
    if (entry.kind === "single") {
      const sc = servCodeMap.get(entry.servCodeId);
      if (!sc) return null;
      const min = fmtDate(sc.dateRange.min);
      const max = fmtDate(sc.dateRange.max);
      if (min && max) return `${min}–${max}`;
      return min ?? max ?? null;
    } else {
      const groupEntry = entry as { kind: "group"; groupId: string };
      const group = groupMap.get(groupEntry.groupId);
      if (!group) return null;
      const mins: string[] = [];
      const maxes: string[] = [];
      for (const id of group.servCodeIds) {
        const sc = servCodeMap.get(id);
        if (sc?.dateRange.min) mins.push(sc.dateRange.min);
        if (sc?.dateRange.max) maxes.push(sc.dateRange.max);
      }
      const minDate = mins.length > 0 ? fmtDate([...mins].sort()[0]) : null;
      const maxDate = maxes.length > 0 ? fmtDate([...maxes].sort().at(-1)) : null;
      if (minDate && maxDate) return `${minDate}–${maxDate}`;
      return minDate ?? maxDate ?? null;
    }
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...entries];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onReorder(next);
  }

  function moveDown(index: number) {
    if (index === entries.length - 1) return;
    const next = [...entries];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onReorder(next);
  }

  function remove(index: number) {
    onReorder(entries.filter((_, i) => i !== index));
  }

  function addGroup(groupId: string) {
    onReorder([...entries, { kind: "group", groupId } as AssignmentEntry]);
    setOpenAdd(false);
  }

  // Only render the body (header is handled by the parent when copy/paste is active)
  if (!employeeName) {
    return (
      <>
        {/* Priority list */}
        <div className="divide-y divide-border/50">
          {entries.length === 0 && (
            <p className="px-3 py-2 text-[10px] text-muted-foreground">No entries assigned.</p>
          )}
          {entries.map((entry, index) => {
            const label = getEntryLabel(entry);
            const dateRange = getEntryDateRange(entry);
            const isGroup = entry.kind === "group";
            const groupEntry = isGroup ? (entry as { kind: "group"; groupId: string }) : null;
            const group = groupEntry ? groupMap.get(groupEntry.groupId) : null;

            return (
              <div
                key={index}
                className={`flex items-center gap-1.5 px-2 py-1.5 text-xs ${isGroup ? "bg-primary/3" : "hover:bg-accent/5"}`}
              >
                <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">{index + 1}</span>
                <div className="flex items-center gap-0 shrink-0">
                  <button onClick={() => moveUp(index)} disabled={index === 0} className="p-0.5 rounded hover:bg-accent/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="Move up"><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={() => moveDown(index)} disabled={index === entries.length - 1} className="p-0.5 rounded hover:bg-accent/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="Move down"><ChevronDown className="w-3 h-3" /></button>
                </div>
                <span className={`font-mono ${isGroup ? "text-primary font-semibold" : "text-foreground"}`}>{label}</span>
                {isGroup && <span className="text-[9px] text-primary bg-primary/10 rounded px-1 shrink-0">group</span>}
                {isGroup && group && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-[9px] text-muted-foreground hover:text-foreground shrink-0" onClick={(e) => e.stopPropagation()}>({group.servCodeIds.join(", ")})</button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Members</p>
                      <div className="space-y-0.5">
                        {group.servCodeIds.map((servCodeId) => {
                          const sc = servCodeMap.get(servCodeId);
                          const range = sc ? fmtDate(sc.dateRange.min) && fmtDate(sc.dateRange.max) ? `${fmtDate(sc.dateRange.min)}–${fmtDate(sc.dateRange.max)}` : null : null;
                          return (
                            <div key={servCodeId} className="flex items-center gap-1 text-[10px]">
                              <span className="font-mono text-foreground flex-1">{servCodeId}</span>
                              <span className="font-mono text-muted-foreground">{range ?? "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {!isGroup && dateRange && <span className="text-[10px] text-muted-foreground font-mono shrink-0">({dateRange})</span>}
                <span className="flex-1" />
                <button onClick={() => remove(index)} className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0" title="Remove"><X className="w-3 h-3" /></button>
              </div>
            );
          })}
        </div>
        <AddEntrySection isOpen={openAdd} onToggleOpen={() => setOpenAdd((v) => !v)} existingGroupIds={existingGroupIds} onAddGroup={addGroup} />
      </>
    );
  }

  return (
    <div className="border border-border rounded overflow-hidden">
      {/* Card header */}
      <div className="px-3 py-2 bg-accent/10 border-b border-border">
        <p className="text-xs font-semibold text-foreground">{employeeName}</p>
        <p className="text-[10px] text-muted-foreground">{entries.length} entries</p>
      </div>

      {/* Priority list */}
      <div className="divide-y divide-border/50">
        {entries.length === 0 && (
          <p className="px-3 py-2 text-[10px] text-muted-foreground">No entries assigned.</p>
        )}
        {entries.map((entry, index) => {
          const label = getEntryLabel(entry);
          const dateRange = getEntryDateRange(entry);
          const isGroup = entry.kind === "group";
          const groupEntry = isGroup ? (entry as { kind: "group"; groupId: string }) : null;
          const group = groupEntry ? groupMap.get(groupEntry.groupId) : null;

          return (
            <div
              key={index}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-xs ${isGroup ? "bg-primary/3" : "hover:bg-accent/5"}`}
            >
              {/* Position number */}
              <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">
                {index + 1}
              </span>

              {/* ↑↓ buttons */}
              <div className="flex items-center gap-0 shrink-0">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-0.5 rounded hover:bg-accent/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  title="Move up"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === entries.length - 1}
                  className="p-0.5 rounded hover:bg-accent/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  title="Move down"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Label + date range */}
              <span className={`font-mono ${isGroup ? "text-primary font-semibold" : "text-foreground"}`}>
                {label}
              </span>
              {isGroup && (
                <span className="text-[9px] text-primary bg-primary/10 rounded px-1 shrink-0">group</span>
              )}
              {isGroup && group && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="text-[9px] text-muted-foreground hover:text-foreground shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      ({group.servCodeIds.join(", ")})
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                      Members
                    </p>
                    <div className="space-y-0.5">
                      {group.servCodeIds.map((servCodeId) => {
                        const sc = servCodeMap.get(servCodeId);
                        const range = sc ? fmtDate(sc.dateRange.min) && fmtDate(sc.dateRange.max)
                          ? `${fmtDate(sc.dateRange.min)}–${fmtDate(sc.dateRange.max)}`
                          : null : null;
                        return (
                          <div key={servCodeId} className="flex items-center gap-1 text-[10px]">
                            <span className="font-mono text-foreground flex-1">{servCodeId}</span>
                            <span className="font-mono text-muted-foreground">{range ?? "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              {!isGroup && dateRange && (
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                  ({dateRange})
                </span>
              )}

              {/* Spacer */}
              <span className="flex-1" />

              {/* Remove button */}
              <button
                onClick={() => remove(index)}
                className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add entry section */}
      <AddEntrySection
        isOpen={openAdd}
        onToggleOpen={() => setOpenAdd((v) => !v)}
        existingGroupIds={existingGroupIds}
        onAddGroup={addGroup}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AssignmentEditorPanel — two-panel layout
// ---------------------------------------------------------------------------

export function AssignmentEditorPanel() {
  const dispatch = useAppDispatch();

  const assignmentPlans = useSelector(assignmentPlanSelect.assignmentPlans);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  const activeEmployees = [...employeeMap.values()].filter((e) => e.active);

  const selectedEmployeeIdsArr = useSelector(paceCrawlerSelect.assignmentEditorSelectedEmployeeIds);
  const selectedEmployeeIds = new Set(selectedEmployeeIdsArr);

  // Clipboard: stores a copied entry list for pasting to other employees
  const [clipboard, setClipboard] = useState<{ entries: AssignmentEntry[]; sourceEmployeeId: string } | null>(null);
  const [pendingPasteEmployeeId, setPendingPasteEmployeeId] = useState<string | null>(null);

  function toggleEmployee(employeeId: string) {
    const next = new Set(selectedEmployeeIds);
    if (next.has(employeeId)) next.delete(employeeId);
    else next.add(employeeId);
    dispatch(paceCrawlerActions.setAssignmentEditorSelectedEmployeeIds([...next]));
  }

  function selectAssigned() {
    const assignedIds = activeEmployees
      .filter((e) => {
        const plan = assignmentsByEmployeeId.get(e.employeeId);
        return (plan?.entries.length ?? 0) > 0;
      })
      .map((e) => e.employeeId);
    dispatch(paceCrawlerActions.setAssignmentEditorSelectedEmployeeIds(assignedIds));
  }

  function clearAll() {
    dispatch(paceCrawlerActions.setAssignmentEditorSelectedEmployeeIds([]));
  }

  function handleReorder(employeeId: string, entries: AssignmentEntry[]) {
    dispatch(assignmentPlanActions.reorderEntries({ employeeId, entries }));
  }

  function handleCopy(employeeId: string, entries: AssignmentEntry[]) {
    setClipboard({ entries: [...entries], sourceEmployeeId: employeeId });
    setPendingPasteEmployeeId(null);
  }

  function handlePasteOverwrite(targetEmployeeId: string) {
    if (!clipboard) return;
    handleReorder(targetEmployeeId, [...clipboard.entries]);
    setClipboard(null);
    setPendingPasteEmployeeId(null);
  }

  function handlePasteAppend(targetEmployeeId: string, currentEntries: AssignmentEntry[]) {
    if (!clipboard) return;
    // Append only entries not already present (by groupId)
    const existingGroupIds = new Set(
      currentEntries.filter((e) => e.kind === "group").map((e) => (e as { kind: "group"; groupId: string }).groupId),
    );
    const toAppend = clipboard.entries.filter((entry) => {
      if (entry.kind !== "group") return false;
      const groupId = (entry as { kind: "group"; groupId: string }).groupId;
      return !existingGroupIds.has(groupId);
    });
    handleReorder(targetEmployeeId, [...currentEntries, ...toAppend]);
    setClipboard(null);
    setPendingPasteEmployeeId(null);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — Group Manager */}
      <div className="w-64 shrink-0 border-r flex flex-col bg-card">
        <AssignmentGroupManager />
      </div>

      {/* Middle panel — Employee selector */}
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
            const assignedCount = plan?.entries.length ?? 0;
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

      {/* Right panel — Employee assignment cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {selectedEmployeeIds.size === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Select employees from the left panel to edit their assignments.
          </p>
        )}

        {[...selectedEmployeeIds].map((employeeId) => {
          const employee = employeeMap.get(employeeId);
          if (!employee) return null;
          const plan = assignmentsByEmployeeId.get(employeeId);
          const entries = plan?.entries ?? [];
          const isSource = clipboard?.sourceEmployeeId === employeeId;
          const isPendingPaste = pendingPasteEmployeeId === employeeId;

          return (
            <div key={employeeId} className="border border-border rounded overflow-hidden">
              {/* Card header with copy/paste controls */}
              <div className="px-3 py-2 bg-accent/10 border-b border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{employee.name}</p>
                    <p className="text-[10px] text-muted-foreground">{entries.length} entries</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Copy button */}
                    <button
                      onClick={() => handleCopy(employeeId, entries)}
                      disabled={entries.length === 0}
                      className={`p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                        isSource
                          ? "text-accent bg-accent/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                      }`}
                      title="Copy assignment list"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {/* Paste button — shown on non-source cards when clipboard is set */}
                    {clipboard && !isSource && (
                      <button
                        onClick={() => setPendingPasteEmployeeId(
                          isPendingPaste ? null : employeeId
                        )}
                        className="p-1 rounded text-primary hover:bg-primary/10 transition-colors"
                        title="Paste assignment list"
                      >
                        <ClipboardPaste className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Paste confirmation row */}
                {isPendingPaste && clipboard && (
                  <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                    <span className="text-muted-foreground shrink-0">Paste:</span>
                    <button
                      onClick={() => handlePasteOverwrite(employeeId)}
                      className="text-destructive font-semibold hover:underline shrink-0"
                    >
                      Overwrite
                    </button>
                    <button
                      onClick={() => handlePasteAppend(employeeId, entries)}
                      className="text-primary font-semibold hover:underline shrink-0"
                    >
                      Append new
                    </button>
                    <button
                      onClick={() => setPendingPasteEmployeeId(null)}
                      className="text-muted-foreground hover:underline shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Priority list + add group */}
              <EmployeeAssignmentCard
                employeeName=""
                entries={entries}
                onReorder={(newEntries: AssignmentEntry[]) => handleReorder(employeeId, newEntries)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
