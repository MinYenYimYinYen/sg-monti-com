"use client";

import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { useGroupSequence } from "@/app/pace/groupSequence/useGroupSequence";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";

type SequenceDialogProps = {
  /** null = create mode, non-null = edit mode */
  sequence: GroupSequence | null;
  open: boolean;
  onCloseAction: () => void;
};

export function SequenceDialog({ sequence, open, onCloseAction }: SequenceDialogProps) {
  const isEditMode = sequence !== null;

  const assignmentGroups = useSelector(paceAssignmentGroupSelect.assignmentGroups);
  const { upsertSequence } = useGroupSequence();

  const [label, setLabel] = useState(sequence?.label ?? "");
  const [daysSince, setDaysSince] = useState(
    sequence?.daysSince && sequence.daysSince > 0 ? String(sequence.daysSince) : "",
  );

  // In edit mode: current members are pre-selected. In create mode: empty.
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    () => sequence?.groupIds ?? [],
  );

  const dragIndexRef = useRef<number | null>(null);

  // Available groups: standalone groups + (in edit mode) the sequence's current members
  const currentMemberIds = new Set(sequence?.groupIds ?? []);
  const availableGroups: AssignmentGroup[] = assignmentGroups.filter(
    (g) => g.sequenceId === null || currentMemberIds.has(g.groupId),
  );

  const selectedGroupSet = new Set(selectedGroupIds);
  const selectedGroups = selectedGroupIds
    .map((id) => availableGroups.find((g) => g.groupId === id))
    .filter((g): g is AssignmentGroup => g !== undefined);

  const unselectedGroups = availableGroups.filter((g) => !selectedGroupSet.has(g.groupId));

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((prev) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      }
      return [...prev, groupId];
    });
  }

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    const next = [...selectedGroupIds];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    dragIndexRef.current = index;
    setSelectedGroupIds(next);
  }

  function handleDrop() {
    dragIndexRef.current = null;
  }

  async function handleSave() {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;

    const parsedDaysSince = parseInt(daysSince, 10);
    const resolvedDaysSince =
      !isNaN(parsedDaysSince) && parsedDaysSince > 0 ? parsedDaysSince : 0;

    await upsertSequence({
      sequenceId: sequence?.sequenceId ?? crypto.randomUUID(),
      label: trimmedLabel,
      groupIds: selectedGroupIds,
      daysSince: resolvedDaysSince,
    });

    onCloseAction();
  }

  const canSave = label.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCloseAction(); }}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Sequence" : "New Sequence"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Label (required)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Lawn Renovation"
              autoFocus
              className="h-8 text-xs px-2 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full"
            />
          </div>

          {/* Days between rounds */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Days between rounds{" "}
              <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="number"
              min={1}
              value={daysSince}
              onChange={(e) => setDaysSince(e.target.value)}
              placeholder="none"
              className="h-8 w-24 text-xs px-2 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Group picker — standalone groups only */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Groups</p>
            {unselectedGroups.length > 0 && (
              <div className="max-h-32 overflow-y-auto border border-border rounded p-2 space-y-0.5">
                {unselectedGroups.map((group) => (
                  <label
                    key={group.groupId}
                    className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-accent/10 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggleGroup(group.groupId)}
                      className="accent-primary shrink-0"
                    />
                    <span className="font-mono text-[10px] font-semibold text-primary">
                      {group.label}
                    </span>
                    <div className="flex flex-wrap gap-0.5">
                      {group.servCodeIds.map((id) => (
                        <span
                          key={id}
                          className="font-mono text-[8px] text-primary/70 bg-primary/10 rounded px-0.5"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {unselectedGroups.length === 0 && selectedGroups.length === 0 && (
              <p className="text-[10px] text-muted-foreground">
                No standalone groups available. Create groups first.
              </p>
            )}
          </div>

          {/* Drag-to-reorder selected groups */}
          {selectedGroups.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Order (drag to reorder)</p>
              <div className="space-y-0.5">
                {selectedGroups.map((group, index) => (
                  <div
                    key={group.groupId}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    className="flex items-center gap-1.5 px-1.5 py-1 rounded border border-border/50 bg-accent/5 cursor-grab active:cursor-grabbing group/row"
                  >
                    <GripVertical className="w-3 h-3 text-muted-foreground/50 group-hover/row:text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-muted-foreground w-3 shrink-0 text-right">
                      {index + 1}
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-primary truncate">
                      {group.label}
                    </span>
                    <div className="flex flex-wrap gap-0.5 ml-1 flex-1">
                      {group.servCodeIds.map((id) => (
                        <span
                          key={id}
                          className="font-mono text-[8px] text-primary/70 bg-primary/10 rounded px-0.5"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => toggleGroup(group.groupId)}
                      className="text-[9px] text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCloseAction}>
            Cancel
          </Button>
          <Button
            variant="primary"
            intensity="solid"
            size="sm"
            disabled={!canSave}
            onClick={() => { void handleSave(); }}
          >
            {isEditMode ? "Save" : "Create Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
