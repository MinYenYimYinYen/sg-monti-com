"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { GitMerge, Plus } from "lucide-react";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { paceGroupSequenceSelect } from "@/app/pace/groupSequence/groupSequenceSelect";
import { usePaceAssignmentGroup } from "@/app/pace/assignmentGroup/useAssignmentGroup";
import { useGroupSequence } from "@/app/pace/groupSequence/useGroupSequence";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { AssignmentGroupRow } from "@/app/pace/assignments/_components/AssignmentGroupRow";
import { NewGroupForm } from "@/app/pace/assignments/_components/NewGroupForm";
import { NewSequenceForm } from "@/app/pace/assignments/_components/NewSequenceForm";

export function PaceAssignmentGroupManager() {
  const assignmentGroups = useSelector(paceAssignmentGroupSelect.assignmentGroups);
  const sequences = useSelector(paceGroupSequenceSelect.sequences);
  const sequenceMap = useSelector(paceGroupSequenceSelect.sequenceMap);
  const sequenceIdByGroupId = useSelector(paceGroupSequenceSelect.sequenceIdByGroupId);

  // Only show groups that are NOT in a user-created multi-member sequence.
  // Groups in sequences are managed via the Sequences panel.
  const multiMemberSequenceGroupIds = new Set(
    sequences.filter((s) => s.groupIds.length > 1).flatMap((s) => s.groupIds),
  );
  const standaloneGroups = assignmentGroups.filter((g) => !multiMemberSequenceGroupIds.has(g.groupId));
  const { upsertGroup, deleteGroup } = usePaceAssignmentGroup();
  const { upsertSequence } = useGroupSequence();
  const [showNewForm, setShowNewForm] = useState(false);
  const [showSequenceForm, setShowSequenceForm] = useState(false);
  const [checkedGroupIds, setCheckedGroupIds] = useState<string[]>([]);
  const progCodes = useSelector(progServSelect.progCodes);
  const servCodeMap = useSelector(progServSelect.servCodeMap);

  const existingGroupServCodeIds = new Set<string>();
  for (const assignmentGroup of assignmentGroups) {
    for (const id of assignmentGroup.servCodeIds) existingGroupServCodeIds.add(id);
  }

  const sortedGroups = [...assignmentGroups].sort((a, b) => a.label.localeCompare(b.label));

  const checkedSet = new Set(checkedGroupIds);

  function toggleGroup(groupId: string) {
    setCheckedGroupIds((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return [...next];
    });
  }

  function handleCreateSequence(label: string, orderedGroupIds: string[]) {
    // Generate a stable sequenceId from the ordered group IDs
    const sequenceId = crypto.randomUUID();
    void upsertSequence({ sequenceId, label, groupIds: orderedGroupIds });
    setCheckedGroupIds([]);
    setShowSequenceForm(false);
  }

  // The selected groups in sorted-list order (preserving the order they appear in the panel)
  const selectedGroupsInOrder = sortedGroups.filter((g) => checkedSet.has(g.groupId));

  const canCreateSequence = checkedSet.size >= 2 && !showSequenceForm;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-3 py-2 border-b border-border flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Groups</span>
        <div className="flex items-center gap-1">
          {canCreateSequence && (
            <button
              onClick={() => {
                setShowSequenceForm(true);
                setShowNewForm(false);
              }}
              className="flex items-center gap-1 text-[10px] text-secondary hover:bg-secondary/10 rounded px-1.5 py-0.5 transition-colors"
            >
              <GitMerge className="w-3 h-3" />
              Sequence ({checkedSet.size})
            </button>
          )}
          <button
            onClick={() => {
              setShowNewForm((v) => !v);
              setShowSequenceForm(false);
            }}
            className="flex items-center gap-1 text-[10px] text-primary hover:bg-primary/10 rounded px-1.5 py-0.5 transition-colors"
          >
            <Plus className="w-3 h-3" />
            New Group
          </button>
        </div>
      </div>

      {showNewForm && (
        <div className="shrink-0 p-3 border-b border-border">
          <NewGroupForm
            existingGroupServCodeIds={existingGroupServCodeIds}
            progCodes={progCodes}
            servCodeMap={servCodeMap}
            onSaveAction={(assignmentGroupDoc) => {
              void upsertGroup(assignmentGroupDoc);
              setShowNewForm(false);
            }}
            onCancelAction={() => setShowNewForm(false)}
          />
        </div>
      )}

      {showSequenceForm && (
        <div className="shrink-0 p-3 border-b border-border">
          <NewSequenceForm
            selectedGroups={selectedGroupsInOrder}
            onSaveAction={handleCreateSequence}
            onCancelAction={() => {
              setShowSequenceForm(false);
              setCheckedGroupIds([]);
            }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {standaloneGroups.length === 0 && !showNewForm && (
          <p className="px-3 py-4 text-[10px] text-muted-foreground text-center">
            No standalone groups. All groups are in sequences.
          </p>
        )}
        {standaloneGroups.sort((a, b) => a.label.localeCompare(b.label)).map((assignmentGroup) => {
          const seqId = sequenceIdByGroupId.get(assignmentGroup.groupId) ?? null;
          const seq = seqId ? sequenceMap.get(seqId) ?? null : null;
          return (
            <AssignmentGroupRow
              key={assignmentGroup.groupId}
              group={assignmentGroup}
              checked={checkedSet.has(assignmentGroup.groupId)}
              sequenceLabel={seq?.label ?? null}
              onToggleAction={toggleGroup}
              onDeleteAction={(id: string) => {
                void deleteGroup(id);
                setCheckedGroupIds((prev) => prev.filter((gid) => gid !== id));
              }}
              onUpdateLabelAction={(id: string, label: string) => {
                const g = assignmentGroups.find((gr) => gr.groupId === id);
                if (g) void upsertGroup({ groupId: g.groupId, label, servCodeIds: g.servCodeIds });
              }}
            />
          );
        })}
      </div>

      <div className="shrink-0 px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
        {assignmentGroups.length} group{assignmentGroups.length !== 1 ? "s" : ""} defined
        {checkedSet.size > 0 && (
          <span className="ml-2 text-secondary font-medium">
            · {checkedSet.size} selected
          </span>
        )}
      </div>
    </div>
  );
}
