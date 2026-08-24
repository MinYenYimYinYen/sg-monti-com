"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { assignmentGroupSelect } from "@/app/assignmentGroup/assignmentGroupSelect";
import { useAssignmentGroup } from "@/app/assignmentGroup/useAssignmentGroup";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { AssignmentGroup } from "@/app/assignmentGroup/AssignmentGroupTypes";
import { Button } from "@/style/components/button";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDollars(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// ProgCodeServCodePicker — multi-select servCodes grouped by progCode
// ---------------------------------------------------------------------------

type ProgCodeServCodePickerProps = {
  existingIds: Set<string>;
  selectedIds: Set<string>;
  onToggle: (servCodeId: string) => void;
  onToggleProgCode: (servCodeIds: string[]) => void;
};

function ProgCodeServCodePicker({
  existingIds,
  selectedIds,
  onToggle,
  onToggleProgCode,
}: ProgCodeServCodePickerProps) {
  const progCodes = useSelector(progServSelect.progCodes);
  const servCodeMap = useSelector(progServSelect.servCodeMap);
  const activePoolMap = useSelector(paceCrawlerSelect.activePoolPriceByServCode);

  const availableProgCodes = progCodes
    .map((progCode) => {
      const availableServCodeIds = progCode.servCodes
        .map((sc) => sc.servCodeId)
        // Exclude servCodes already in a group AND alwaysAsap servCodes
        .filter((id) => {
          if (existingIds.has(id)) return false;
          const sc = servCodeMap.get(id);
          if (sc?.alwaysAsap) return false;
          return true;
        });
      return { progCodeId: progCode.progCodeId, availableServCodeIds };
    })
    .filter((p) => p.availableServCodeIds.length > 0);

  if (availableProgCodes.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground">All servCodes already in a group.</p>
    );
  }

  return (
    <div className="space-y-2">
      {availableProgCodes.map(({ progCodeId, availableServCodeIds }) => {
        const selectedCount = availableServCodeIds.filter((id) => selectedIds.has(id)).length;
        const allSelected = selectedCount === availableServCodeIds.length;
        const someSelected = selectedCount > 0 && !allSelected;

        return (
          <div key={progCodeId} className="space-y-0.5">
            {/* ProgCode header with select-all checkbox */}
            <label className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-accent/10 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={() => onToggleProgCode(availableServCodeIds)}
                className="accent-primary shrink-0"
              />
              <span className="font-mono text-[10px] font-semibold text-foreground">{progCodeId}</span>
            </label>
            {/* Individual servCodes */}
            <div className="pl-4 space-y-0.5">
              {availableServCodeIds.map((servCodeId) => {
                const isSelected = selectedIds.has(servCodeId);
                const pool = activePoolMap.get(servCodeId) ?? 0;
                const hasPool = pool > 0;

                return (
                  <label
                    key={servCodeId}
                    className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-accent/10 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(servCodeId)}
                      className="accent-primary shrink-0"
                    />
                    {/* ServCode ID */}
                    <span className={`font-mono text-[10px] ${!isSelected && hasPool ? "text-destructive font-semibold" : "text-foreground"}`}>
                      {servCodeId}
                    </span>
                    {/* Pool price */}
                    {hasPool && (
                      <span className={`font-mono text-[10px] ml-auto shrink-0 ${isSelected ? "text-muted-foreground" : "text-destructive"}`}>
                        {formatDollars(pool)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupRow — one row in the group list
// ---------------------------------------------------------------------------

type GroupRowProps = {
  group: AssignmentGroup;
  onDelete: (groupId: string) => void;
  onUpdateLabel: (groupId: string, label: string) => void;
};

function GroupRow({ group, onDelete, onUpdateLabel }: GroupRowProps) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(group.label);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSaveLabel() {
    const trimmed = labelDraft.trim();
    if (trimmed && trimmed !== group.label) {
      onUpdateLabel(group.groupId, trimmed);
    }
    setEditingLabel(false);
  }

  function handleCancelLabel() {
    setLabelDraft(group.label);
    setEditingLabel(false);
  }

  return (
    <div className="flex items-start gap-2 px-3 py-2 border-b border-border/50 hover:bg-accent/5">
      {/* Label + members */}
      <div className="flex-1 min-w-0">
        {editingLabel ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveLabel();
                if (e.key === "Escape") handleCancelLabel();
              }}
              autoFocus
              className="h-5 text-[10px] px-1.5 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary flex-1 min-w-0"
            />
            <button onClick={handleSaveLabel} className="p-0.5 rounded text-accent hover:bg-accent/10">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={handleCancelLabel} className="p-0.5 rounded text-muted-foreground hover:bg-accent/10">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground truncate">{group.label}</span>
            <button
              onClick={() => { setEditingLabel(true); setLabelDraft(group.label); }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors shrink-0"
              title="Edit label"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {group.servCodeIds.map((id) => (
            <span key={id} className="font-mono text-[9px] text-primary bg-primary/10 rounded px-1">
              {id}
            </span>
          ))}
        </div>
      </div>

      {/* Delete button */}
      <div className="shrink-0">
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { onDelete(group.groupId); setConfirmDelete(false); }}
              className="text-[9px] text-destructive font-semibold hover:underline"
            >
              Del
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[9px] text-muted-foreground hover:underline"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete group"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewGroupForm — inline form for creating a new group
// ---------------------------------------------------------------------------

type NewGroupFormProps = {
  existingGroupServCodeIds: Set<string>;
  onSave: (group: AssignmentGroup) => void;
  onCancel: () => void;
};

function NewGroupForm({ existingGroupServCodeIds, onSave, onCancel }: NewGroupFormProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [label, setLabel] = useState("");

  function toggleServCode(servCodeId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(servCodeId)) next.delete(servCodeId);
      else next.add(servCodeId);
      return next;
    });
  }

  function toggleProgCode(availableServCodeIds: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = availableServCodeIds.every((id) => next.has(id));
      if (allSelected) {
        for (const id of availableServCodeIds) next.delete(id);
      } else {
        for (const id of availableServCodeIds) next.add(id);
      }
      return next;
    });
  }

  function handleSave() {
    if (selectedIds.size === 0) return;
    const sortedIds = [...selectedIds].sort();
    const groupId = sortedIds.join("+");
    const groupLabel = label.trim() || groupId;
    onSave({ groupId, label: groupLabel, servCodeIds: sortedIds });
  }

  return (
    <div className="border border-border rounded bg-card p-3 space-y-3">
      <p className="text-[10px] font-semibold text-foreground uppercase tracking-wide">New Group</p>
      <p className="text-[10px] text-muted-foreground">
        <span className="text-destructive font-semibold">Red</span> = unscheduled revenue remaining. Select all servCodes that route together.
      </p>

      {/* ServCode picker */}
      <div className="max-h-48 overflow-y-auto">
        <ProgCodeServCodePicker
          existingIds={existingGroupServCodeIds}
          selectedIds={selectedIds}
          onToggle={toggleServCode}
          onToggleProgCode={toggleProgCode}
        />
      </div>

      {/* Label input */}
      {selectedIds.size > 0 && (
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">
            Label (optional — defaults to servCode IDs)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={[...selectedIds].sort().join("+")}
            className="h-6 text-[10px] px-2 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          intensity="solid"
          disabled={selectedIds.size === 0}
          onClick={handleSave}
          className="h-6 text-[10px]"
        >
          Create Group ({selectedIds.size} servCodes)
        </Button>
        <button
          onClick={onCancel}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AssignmentGroupManager — main component
// ---------------------------------------------------------------------------

export function AssignmentGroupManager() {
  const groups = useSelector(assignmentGroupSelect.groups);
  const { upsertGroup, deleteGroup } = useAssignmentGroup();
  const [showNewForm, setShowNewForm] = useState(false);

  // Build set of all servCodeIds already in any group (for the picker)
  const existingGroupServCodeIds = new Set<string>();
  for (const group of groups) {
    for (const id of group.servCodeIds) existingGroupServCodeIds.add(id);
  }

  // Sort groups alphabetically by label
  const sortedGroups = [...groups].sort((a, b) => a.label.localeCompare(b.label));

  function handleCreate(group: AssignmentGroup) {
    void upsertGroup(group);
    setShowNewForm(false);
  }

  function handleDelete(groupId: string) {
    void deleteGroup(groupId);
  }

  function handleUpdateLabel(groupId: string, label: string) {
    const group = groups.find((g) => g.groupId === groupId);
    if (!group) return;
    void upsertGroup({ ...group, label });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Groups
        </span>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="flex items-center gap-1 text-[10px] text-primary hover:bg-primary/10 rounded px-1.5 py-0.5 transition-colors"
        >
          <Plus className="w-3 h-3" />
          New Group
        </button>
      </div>

      {/* New group form */}
      {showNewForm && (
        <div className="shrink-0 p-3 border-b border-border">
          <NewGroupForm
            existingGroupServCodeIds={existingGroupServCodeIds}
            onSave={handleCreate}
            onCancel={() => setShowNewForm(false)}
          />
        </div>
      )}

      {/* Group list — sorted alphabetically */}
      <div className="flex-1 overflow-y-auto">
        {sortedGroups.length === 0 && !showNewForm && (
          <p className="px-3 py-4 text-[10px] text-muted-foreground text-center">
            No groups defined. Click &ldquo;New Group&rdquo; to create one.
          </p>
        )}
        {sortedGroups.map((group) => (
          <GroupRow
            key={group.groupId}
            group={group}
            onDelete={handleDelete}
            onUpdateLabel={handleUpdateLabel}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
        {groups.length} group{groups.length !== 1 ? "s" : ""} defined
      </div>
    </div>
  );
}
