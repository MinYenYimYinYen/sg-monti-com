"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { ServCodePicker } from "@/app/pace/setup/groups/_components/ServCodePicker";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { paceGroupSequenceSelect } from "@/app/pace/groupSequence/groupSequenceSelect";
import { usePaceAssignmentGroup } from "@/app/pace/assignmentGroup/useAssignmentGroup";
import { useGroupSequence } from "@/app/pace/groupSequence/useGroupSequence";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";

type SequenceMembership =
  | { mode: "standalone" }
  | { mode: "existing"; sequenceId: string }
  | { mode: "new"; label: string; daysSince: string };

type GroupDialogProps = {
  /** null = create mode, non-null = edit mode */
  group: AssignmentGroup | null;
  open: boolean;
  onCloseAction: () => void;
};

export function GroupDialog({ group, open, onCloseAction }: GroupDialogProps) {
  const isEditMode = group !== null;

  const assignmentGroups = useSelector(paceAssignmentGroupSelect.assignmentGroups);
  const sequences = useSelector(paceGroupSequenceSelect.sequences);
  const { upsertGroup } = usePaceAssignmentGroup();
  const { upsertSequence } = useGroupSequence();

  // ServCode selection — disabled in edit mode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(group?.servCodeIds ?? []),
  );
  const [label, setLabel] = useState(group?.label ?? "");
  const [membership, setMembership] = useState<SequenceMembership>(() => {
    if (group?.sequenceId) return { mode: "existing", sequenceId: group.sequenceId };
    return { mode: "standalone" };
  });

  // Build the set of servCodes already in OTHER groups (not this one)
  const existingGroupServCodeIds = new Set<string>();
  for (const ag of assignmentGroups) {
    if (ag.groupId === group?.groupId) continue;
    for (const id of ag.servCodeIds) existingGroupServCodeIds.add(id);
  }

  function handleToggle(servCodeId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(servCodeId) ? next.delete(servCodeId) : next.add(servCodeId);
      return next;
    });
  }

  function handleToggleProgCode(servCodeIds: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = servCodeIds.every((id) => next.has(id));
      if (allSelected) {
        servCodeIds.forEach((id) => next.delete(id));
      } else {
        servCodeIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleSave() {
    const sortedIds = isEditMode
      ? [...(group?.servCodeIds ?? [])].sort()
      : [...selectedIds].sort();

    if (sortedIds.length === 0) return;

    const groupId = sortedIds.join("+");
    const resolvedLabel = label.trim() || groupId;

    await upsertGroup({ groupId, label: resolvedLabel, servCodeIds: sortedIds });

    if (membership.mode === "existing") {
      const existingSeq = sequences.find((s) => s.sequenceId === membership.sequenceId);
      if (existingSeq && !existingSeq.groupIds.includes(groupId)) {
        await upsertSequence({
          ...existingSeq,
          groupIds: [...existingSeq.groupIds, groupId],
        });
      }
    } else if (membership.mode === "new") {
      const seqLabel = membership.label.trim();
      if (seqLabel) {
        const parsedDaysSince = parseInt(membership.daysSince, 10);
        const daysSince =
          !isNaN(parsedDaysSince) && parsedDaysSince > 0 ? parsedDaysSince : 0;
        await upsertSequence({
          sequenceId: crypto.randomUUID(),
          label: seqLabel,
          groupIds: [groupId],
          daysSince,
        });
      }
    }

    onCloseAction();
  }

  const canSave = isEditMode
    ? true
    : selectedIds.size > 0;

  const autoLabel = [...selectedIds].sort().join("+");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCloseAction(); }}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Group" : "New Group"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ServCode picker — disabled in edit mode */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">
              ServCodes
              {isEditMode && (
                <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                  (cannot change after creation)
                </span>
              )}
            </p>
            {isEditMode ? (
              <div className="flex flex-wrap gap-1">
                {group.servCodeIds.map((id) => (
                  <span
                    key={id}
                    className="font-mono text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5"
                  >
                    {id}
                  </span>
                ))}
              </div>
            ) : (
              <ServCodePicker
                existingGroupServCodeIds={existingGroupServCodeIds}
                selectedIds={selectedIds}
                onToggle={handleToggle}
                onToggleProgCode={handleToggleProgCode}
              />
            )}
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={isEditMode ? group.label : autoLabel || "e.g. LR1/LM"}
              className="h-8 text-xs px-2 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full"
            />
          </div>

          {/* Sequence membership */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Sequence membership</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="membership"
                  checked={membership.mode === "standalone"}
                  onChange={() => setMembership({ mode: "standalone" })}
                  className="accent-primary"
                />
                <span className="text-xs text-foreground">Standalone</span>
              </label>

              {sequences.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="membership"
                    checked={membership.mode === "existing"}
                    onChange={() =>
                      setMembership({ mode: "existing", sequenceId: sequences[0].sequenceId })
                    }
                    className="accent-primary"
                  />
                  <span className="text-xs text-foreground">Add to existing sequence</span>
                </label>
              )}

              {membership.mode === "existing" && (
                <div className="pl-6">
                  <select
                    value={membership.sequenceId}
                    onChange={(e) =>
                      setMembership({ mode: "existing", sequenceId: e.target.value })
                    }
                    className="h-7 text-xs px-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {sequences.map((s) => (
                      <option key={s.sequenceId} value={s.sequenceId}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="membership"
                  checked={membership.mode === "new"}
                  onChange={() => setMembership({ mode: "new", label: "", daysSince: "" })}
                  className="accent-primary"
                />
                <span className="text-xs text-foreground">Create new sequence with this group</span>
              </label>

              {membership.mode === "new" && (
                <div className="pl-6 space-y-2">
                  <input
                    type="text"
                    value={membership.label}
                    onChange={(e) =>
                      setMembership({ mode: "new", label: e.target.value, daysSince: membership.daysSince })
                    }
                    placeholder="Sequence label (required)"
                    className="h-7 text-xs px-2 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-muted-foreground shrink-0">
                      Days between rounds:
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={membership.daysSince}
                      onChange={(e) =>
                        setMembership({ mode: "new", label: membership.label, daysSince: e.target.value })
                      }
                      placeholder="none"
                      className="h-7 w-20 text-xs px-2 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
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
            {isEditMode ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
