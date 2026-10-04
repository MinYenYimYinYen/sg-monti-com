"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Plus } from "lucide-react";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { usePaceAssignmentGroup } from "@/app/pace/assignmentGroup/useAssignmentGroup";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { AssignmentGroupRow } from "@/app/pace/assignments/_components/AssignmentGroupRow";
import { NewGroupForm } from "@/app/pace/assignments/_components/NewGroupForm";

export function PaceAssignmentGroupManager() {
  const groups = useSelector(paceAssignmentGroupSelect.groups);
  const { upsertGroup, deleteGroup } = usePaceAssignmentGroup();
  const [showNewForm, setShowNewForm] = useState(false);
  const progCodes = useSelector(progServSelect.progCodes);
  const servCodeMap = useSelector(progServSelect.servCodeMap);

  const existingGroupServCodeIds = new Set<string>();
  for (const group of groups) {
    for (const id of group.servCodeIds) existingGroupServCodeIds.add(id);
  }

  const sortedGroups = [...groups].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Groups</span>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="flex items-center gap-1 text-[10px] text-primary hover:bg-primary/10 rounded px-1.5 py-0.5 transition-colors"
        >
          <Plus className="w-3 h-3" />
          New Group
        </button>
      </div>

      {showNewForm && (
        <div className="shrink-0 p-3 border-b border-border">
          <NewGroupForm
            existingGroupServCodeIds={existingGroupServCodeIds}
            progCodes={progCodes}
            servCodeMap={servCodeMap}
            onSave={(group) => {
              void upsertGroup(group);
              setShowNewForm(false);
            }}
            onCancel={() => setShowNewForm(false)}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {sortedGroups.length === 0 && !showNewForm && (
          <p className="px-3 py-4 text-[10px] text-muted-foreground text-center">
            No groups defined. Click &ldquo;New Group&rdquo; to create one.
          </p>
        )}
        {sortedGroups.map((group) => (
          <AssignmentGroupRow
            key={group.groupId}
            group={group}
            onDelete={(id) => void deleteGroup(id)}
            onUpdateLabel={(id, label) => {
              const g = groups.find((g) => g.groupId === id);
              if (g) void upsertGroup({ ...g, label });
            }}
          />
        ))}
      </div>

      <div className="shrink-0 px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
        {groups.length} group{groups.length !== 1 ? "s" : ""} defined
      </div>
    </div>
  );
}
