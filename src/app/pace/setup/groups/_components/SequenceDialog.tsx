"use client";

import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { GripVertical, Plus, X } from "lucide-react";
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
import { GroupDialog } from "@/app/pace/setup/groups/_components/GroupDialog";

type SequenceDialogProps = {
  /** null = create mode, non-null = edit mode */
  sequence: GroupSequence | null;
  open: boolean;
  onCloseAction: () => void;
};

// ---------------------------------------------------------------------------
// Slot type — used only in create mode
// ---------------------------------------------------------------------------

type Slot = {
  id: string;
  groupId: string | null;
};

// ---------------------------------------------------------------------------
// SequenceDialog
// ---------------------------------------------------------------------------

export function SequenceDialog({ sequence, open, onCloseAction }: SequenceDialogProps) {
  const isEditMode = sequence !== null;

  const assignmentGroups = useSelector(paceAssignmentGroupSelect.assignmentGroups);
  const { upsertSequence } = useGroupSequence();

  const [label, setLabel] = useState(sequence?.label ?? "");
  const [daysSince, setDaysSince] = useState(
    sequence?.daysSince && sequence.daysSince > 0 ? String(sequence.daysSince) : "",
  );

  // ---------------------------------------------------------------------------
  // Edit mode state (checkbox + drag-reorder — unchanged from original)
  // ---------------------------------------------------------------------------
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    () => sequence?.groupIds ?? [],
  );
  const dragIndexRef = useRef<number | null>(null);

  // Available groups for edit mode: standalone + current members
  const currentMemberIds = new Set(sequence?.groupIds ?? []);
  const availableGroupsForEdit: AssignmentGroup[] = assignmentGroups.filter(
    (g) => g.sequenceId === null || currentMemberIds.has(g.groupId),
  );
  const selectedGroupSet = new Set(selectedGroupIds);
  const selectedGroups = selectedGroupIds
    .map((id) => availableGroupsForEdit.find((g) => g.groupId === id))
    .filter((g): g is AssignmentGroup => g !== undefined);
  const unselectedGroups = availableGroupsForEdit.filter((g) => !selectedGroupSet.has(g.groupId));

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
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

  // ---------------------------------------------------------------------------
  // Create mode state (slot-based builder)
  // ---------------------------------------------------------------------------
  const [slots, setSlots] = useState<Slot[]>([{ id: crypto.randomUUID(), groupId: null }]);
  const [newGroupForSlotId, setNewGroupForSlotId] = useState<string | null>(null);
  const slotDragIndexRef = useRef<number | null>(null);

  // Groups available for slots: standalone groups not already used in another slot
  const usedGroupIds = new Set(slots.map((s) => s.groupId).filter(Boolean) as string[]);
  const availableGroupsForSlots = assignmentGroups
    .filter((g) => g.sequenceId === null && !usedGroupIds.has(g.groupId))
    .sort((a, b) => a.label.localeCompare(b.label));

  function setSlotGroup(slotId: string, groupId: string | null) {
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, groupId } : s)));
  }

  function removeSlot(slotId: string) {
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  }

  function addSlot() {
    setSlots((prev) => [...prev, { id: crypto.randomUUID(), groupId: null }]);
  }

  function handleSlotDragStart(index: number) {
    slotDragIndexRef.current = index;
  }

  function handleSlotDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from = slotDragIndexRef.current;
    if (from === null || from === index) return;
    const next = [...slots];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    slotDragIndexRef.current = index;
    setSlots(next);
  }

  function handleSlotDrop() {
    slotDragIndexRef.current = null;
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async function handleSave() {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;

    const parsedDaysSince = parseInt(daysSince, 10);
    const resolvedDaysSince =
      !isNaN(parsedDaysSince) && parsedDaysSince > 0 ? parsedDaysSince : 0;

    const groupIds = isEditMode
      ? selectedGroupIds
      : slots.map((s) => s.groupId).filter((id): id is string => id !== null);

    await upsertSequence({
      sequenceId: sequence?.sequenceId ?? crypto.randomUUID(),
      label: trimmedLabel,
      groupIds,
      daysSince: resolvedDaysSince,
    });

    onCloseAction();
  }

  const canSave = label.trim().length > 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
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
                type="text"
                inputMode="numeric"
                value={daysSince}
                onChange={(e) => setDaysSince(e.target.value)}
                onBlur={() => {
                  const trimmed = daysSince.trim();
                  if (trimmed === "") return;
                  const n = parseInt(trimmed, 10);
                  if (!isNaN(n) && n >= 0) {
                    setDaysSince(n > 0 ? String(n) : "");
                  } else {
                    setDaysSince(
                      sequence?.daysSince && sequence.daysSince > 0
                        ? String(sequence.daysSince)
                        : "",
                    );
                  }
                }}
                placeholder="none"
                className="h-8 w-24 text-xs px-2 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Groups section */}
            {isEditMode ? (
              /* Edit mode: checkbox picker + drag-to-reorder */
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
            ) : (
              /* Create mode: slot-based builder */
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Groups (drag to reorder)</p>
                <div className="space-y-1">
                  {slots.map((slot, index) => (
                    <div
                      key={slot.id}
                      draggable
                      onDragStart={() => handleSlotDragStart(index)}
                      onDragOver={(e) => handleSlotDragOver(e, index)}
                      onDrop={handleSlotDrop}
                      className="flex items-center gap-1.5 px-1.5 py-1.5 rounded border border-border/50 bg-accent/5 cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                      <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0 font-mono">
                        {index + 1}
                      </span>

                      {slot.groupId ? (
                        /* Filled slot — show group label + clear button */
                        <>
                          <span className="font-mono text-[10px] font-semibold text-primary flex-1 truncate">
                            {assignmentGroups.find((g) => g.groupId === slot.groupId)?.label ?? slot.groupId}
                          </span>
                          <button
                            onClick={() => setSlotGroup(slot.id, null)}
                            className="text-[9px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            title="Clear slot"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        /* Empty slot — dropdown + New Group button */
                        <>
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) setSlotGroup(slot.id, e.target.value);
                            }}
                            className="flex-1 h-6 text-[10px] px-1.5 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">Select a group…</option>
                            {availableGroupsForSlots.map((g) => (
                              <option key={g.groupId} value={g.groupId}>
                                {g.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setNewGroupForSlotId(slot.id)}
                            className="flex items-center gap-0.5 h-6 px-1.5 rounded text-[10px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors shrink-0"
                            title="Create new group for this slot"
                          >
                            <Plus className="w-3 h-3" />
                            New
                          </button>
                        </>
                      )}

                      {/* Remove slot */}
                      <button
                        onClick={() => removeSlot(slot.id)}
                        className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        title="Remove slot"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addSlot}
                  className="flex items-center gap-1 h-6 px-2 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add slot
                </button>
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

      {/* Stacked GroupDialog — opens when user clicks "New" in a slot */}
      {newGroupForSlotId && (
        <GroupDialog
          group={null}
          open={true}
          onCloseAction={() => setNewGroupForSlotId(null)}
          onCreatedGroupId={(groupId) => {
            setSlotGroup(newGroupForSlotId, groupId);
            setNewGroupForSlotId(null);
          }}
        />
      )}
    </>
  );
}
