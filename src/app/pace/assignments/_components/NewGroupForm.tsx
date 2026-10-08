"use client";

import { useState } from "react";
import { AssignmentGroupDoc } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { Button } from "@/style/components/button";

export function NewGroupForm({
  existingGroupServCodeIds,
  progCodes,
  servCodeMap,
  onSaveAction,
  onCancelAction,
}: {
  existingGroupServCodeIds: Set<string>;
  progCodes: ReturnType<typeof progServSelect.progCodes>;
  servCodeMap: ReturnType<typeof progServSelect.servCodeMap>;
  onSaveAction: (assignmentGroupDoc: AssignmentGroupDoc) => void;
  onCancelAction: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [label, setLabel] = useState("");

  const availableProgCodes = progCodes
    .map((pc) => ({
      progCodeId: pc.progCodeId,
      availableServCodeIds: pc.servCodes
        .map((sc) => sc.servCodeId)
        .filter((id) => !existingGroupServCodeIds.has(id) && !servCodeMap.get(id)?.alwaysAsap),
    }))
    .filter((p) => p.availableServCodeIds.length > 0);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSave() {
    if (selectedIds.size === 0) return;
    const sortedIds = [...selectedIds].sort();
    onSaveAction({
      groupId: sortedIds.join("+"),
      label: label.trim() || sortedIds.join("+"),
      servCodeIds: sortedIds,
    });
  }

  return (
    <div className="border border-border rounded bg-card p-3 space-y-3">
      <p className="text-[10px] font-semibold text-foreground uppercase tracking-wide">New Group</p>
      <div className="max-h-48 overflow-y-auto space-y-2">
        {availableProgCodes.map(({ progCodeId, availableServCodeIds }) => (
          <div key={progCodeId} className="space-y-0.5">
            <span className="font-mono text-[10px] font-semibold text-foreground px-1">
              {progCodeId}
            </span>
            <div className="pl-4 space-y-0.5">
              {availableServCodeIds.map((id) => (
                <label
                  key={id}
                  className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-accent/10 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(id)}
                    onChange={() => toggle(id)}
                    className="accent-primary shrink-0"
                  />
                  <span className="font-mono text-[10px] text-foreground">{id}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {availableProgCodes.length === 0 && (
          <p className="text-[10px] text-muted-foreground">All servCodes already in a group.</p>
        )}
      </div>
      {selectedIds.size > 0 && (
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={[...selectedIds].sort().join("+")}
          className="h-6 text-[10px] px-2 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full"
        />
      )}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          intensity="solid"
          disabled={selectedIds.size === 0}
          onClick={handleSave}
          className="h-6 text-[10px]"
        >
          Create ({selectedIds.size})
        </Button>
        <button
          onClick={onCancelAction}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
