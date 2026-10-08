"use client";

import { useSelector } from "react-redux";
import { paceGroupSequenceSelect } from "@/app/pace/groupSequence/groupSequenceSelect";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { useGroupSequence } from "@/app/pace/groupSequence/useGroupSequence";
import { Accordion } from "@/style/components/accordion";
import { GroupSequenceRow } from "@/app/pace/assignments/_components/GroupSequenceRow";

export function GroupSequencePanel() {
  const sequences = useSelector(paceGroupSequenceSelect.sequences);
  const assignmentGroupMap = useSelector(paceAssignmentGroupSelect.assignmentGroupMap);
  const { upsertSequence, deleteSequence } = useGroupSequence();

  function handleDelete(sequenceId: string) {
    void deleteSequence(sequenceId);
  }

  function handleUpdateLabel(sequenceId: string, label: string) {
    const sequence = sequences.find((s) => s.sequenceId === sequenceId);
    if (!sequence) return;
    void upsertSequence({ ...sequence, label });
  }

  function handleUpdateDaysSince(sequenceId: string, daysSince: number | null) {
    const sequence = sequences.find((s) => s.sequenceId === sequenceId);
    if (!sequence) return;
    void upsertSequence({ ...sequence, daysSince: daysSince ?? 0 });
  }

  function handleReorderGroups(sequenceId: string, groupIds: string[]) {
    const sequence = sequences.find((s) => s.sequenceId === sequenceId);
    if (!sequence) return;
    void upsertSequence({ ...sequence, groupIds });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-3 py-2 border-b border-border flex items-center">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Sequences
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sequences.length === 0 ? (
          <div className="px-3 py-4 space-y-1">
            <p className="text-[10px] text-muted-foreground text-center">No sequences defined.</p>
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Check 2+ groups in the Groups panel, then click &ldquo;Create Sequence&rdquo;.
            </p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {sequences.map((sequence) => (
              <GroupSequenceRow
                key={sequence.sequenceId}
                sequence={sequence}
                groupMap={assignmentGroupMap}
                onDeleteAction={handleDelete}
                onUpdateLabelAction={handleUpdateLabel}
                onUpdateDaysSinceAction={handleUpdateDaysSince}
                onReorderGroupsAction={handleReorderGroups}
              />
            ))}
          </Accordion>
        )}
      </div>

      <div className="shrink-0 px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
        {sequences.length} sequence{sequences.length !== 1 ? "s" : ""} defined
      </div>
    </div>
  );
}
