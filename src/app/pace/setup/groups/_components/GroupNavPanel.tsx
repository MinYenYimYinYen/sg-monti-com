"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Pencil, X } from "lucide-react";
import { setupSelect } from "@/app/pace/setup/setupSelect";
import { GroupNavItem } from "@/app/pace/setup/groups/_components/GroupNavItem";
import { GroupDialog } from "@/app/pace/setup/groups/_components/GroupDialog";
import { SequenceDialog } from "@/app/pace/setup/groups/_components/SequenceDialog";
import { DeleteSequenceDialog } from "@/app/pace/setup/groups/_components/DeleteSequenceDialog";
import { useGroupSequence } from "@/app/pace/groupSequence/useGroupSequence";
import { SequenceWithGroups } from "@/app/pace/setup/setupSelect";

type GroupNavPanelProps = {
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onGroupDeleted?: (groupId: string) => void;
};

export function GroupNavPanel({ selectedGroupId, onSelectGroup, onGroupDeleted }: GroupNavPanelProps) {
  const sequencesWithGroups = useSelector(setupSelect.sequencesWithGroups);
  const standaloneGroups = useSelector(setupSelect.standaloneGroups);

  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newSequenceOpen, setNewSequenceOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<SequenceWithGroups | null>(null);

  return (
    <>
      <div className="flex flex-col h-full border-r border-border">
        {/* Toolbar */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b border-border bg-card">
          <button
            onClick={() => setNewGroupOpen(true)}
            className="flex items-center gap-1 h-6 px-2 rounded text-[10px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Group
          </button>
          <button
            onClick={() => setNewSequenceOpen(true)}
            className="flex items-center gap-1 h-6 px-2 rounded text-[10px] font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Sequence
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Sequences — always expanded */}
          {sequencesWithGroups.map((sequenceWithGroups) => (
            <SequenceNavSection
              key={sequenceWithGroups.sequenceId}
              sequenceWithGroups={sequenceWithGroups}
              selectedGroupId={selectedGroupId}
              onSelectGroup={onSelectGroup}
              onEdit={() => setEditingSequence(sequenceWithGroups)}
              onGroupDeleted={onGroupDeleted}
            />
          ))}

          {/* Standalone groups */}
          {standaloneGroups.length > 0 && (
            <div>
              {standaloneGroups.length > 0 && sequencesWithGroups.length > 0 && (
                <div className="px-3 py-1 border-t border-border/50">
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Standalone
                  </span>
                </div>
              )}
              {standaloneGroups.map((group) => (
                <GroupNavItem
                  key={group.groupId}
                  group={group}
                  isSelected={selectedGroupId === group.groupId}
                  onSelect={() => onSelectGroup(group.groupId)}
                  onDeletedAction={() => onGroupDeleted?.(group.groupId)}
                />
              ))}
            </div>
          )}

          {sequencesWithGroups.length === 0 && standaloneGroups.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 px-3">
              No groups yet. Create a group to get started.
            </p>
          )}
        </div>
      </div>

      {newGroupOpen && (
        <GroupDialog
          group={null}
          open={newGroupOpen}
          onCloseAction={() => setNewGroupOpen(false)}
        />
      )}

      {newSequenceOpen && (
        <SequenceDialog
          sequence={null}
          open={newSequenceOpen}
          onCloseAction={() => setNewSequenceOpen(false)}
        />
      )}

      {editingSequence && (
        <SequenceDialog
          sequence={editingSequence}
          open={true}
          onCloseAction={() => setEditingSequence(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// SequenceNavSection — inline-editable sequence header + member group rows
// ---------------------------------------------------------------------------

type SequenceNavSectionProps = {
  sequenceWithGroups: SequenceWithGroups;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onEdit: () => void;
  onGroupDeleted?: (groupId: string) => void;
};

function SequenceNavSection({
  sequenceWithGroups,
  selectedGroupId,
  onSelectGroup,
  onEdit,
  onGroupDeleted,
}: SequenceNavSectionProps) {
  const { upsertSequence } = useGroupSequence();
  const [labelValue, setLabelValue] = useState(sequenceWithGroups.label);
  const [daysSinceValue, setDaysSinceValue] = useState(
    sequenceWithGroups.daysSince > 0 ? String(sequenceWithGroups.daysSince) : "",
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleLabelBlur() {
    const trimmed = labelValue.trim();
    if (trimmed && trimmed !== sequenceWithGroups.label) {
      void upsertSequence({ ...sequenceWithGroups, label: trimmed });
    } else if (!trimmed) {
      setLabelValue(sequenceWithGroups.label);
    }
  }

  function handleDaysSinceBlur() {
    const trimmed = daysSinceValue.trim();
    if (trimmed === "") {
      if (sequenceWithGroups.daysSince !== 0) {
        void upsertSequence({ ...sequenceWithGroups, daysSince: 0 });
      }
      return;
    }
    const n = parseInt(trimmed, 10);
    if (!isNaN(n) && n >= 0) {
      if (n !== sequenceWithGroups.daysSince) {
        void upsertSequence({ ...sequenceWithGroups, daysSince: n });
      }
      setDaysSinceValue(n > 0 ? String(n) : "");
    } else {
      setDaysSinceValue(sequenceWithGroups.daysSince > 0 ? String(sequenceWithGroups.daysSince) : "");
    }
  }

  return (
    <>
      <div className="border-b border-border/30">
        {/* Sequence header */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-accent/5 group/seq">
          {/* Inline label edit */}
          <input
            type="text"
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value)}
            onBlur={handleLabelBlur}
            className="flex-1 min-w-0 text-[10px] font-semibold text-foreground bg-transparent border-0 outline-none focus:bg-card focus:ring-1 focus:ring-primary rounded px-0.5 py-0"
            title="Sequence name (click to edit)"
          />

          {/* Days between rounds */}
          <div className="flex items-center gap-0.5 shrink-0">
            <input
              type="text"
              inputMode="numeric"
              value={daysSinceValue}
              onChange={(e) => setDaysSinceValue(e.target.value)}
              onBlur={handleDaysSinceBlur}
              placeholder="0d"
              className="w-8 text-[9px] text-muted-foreground bg-transparent border-0 outline-none focus:bg-card focus:ring-1 focus:ring-primary rounded px-0.5 py-0 text-center"
              title="Days between rounds"
            />
            <span className="text-[9px] text-muted-foreground">d</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/seq:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
              title="Edit sequence"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete sequence"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Member groups */}
        {sequenceWithGroups.groups.length === 0 ? (
          <p className="px-4 py-1.5 text-[9px] text-muted-foreground">No groups in sequence.</p>
        ) : (
          sequenceWithGroups.groups.map((group) => (
            <GroupNavItem
              key={group.groupId}
              group={group}
              isSelected={selectedGroupId === group.groupId}
              onSelect={() => onSelectGroup(group.groupId)}
              onDeletedAction={() => onGroupDeleted?.(group.groupId)}
            />
          ))
        )}
      </div>

      {deleteOpen && (
        <DeleteSequenceDialog
          sequenceWithGroups={sequenceWithGroups}
          open={deleteOpen}
          onCloseAction={() => setDeleteOpen(false)}
        />
      )}
    </>
  );
}
