"use client";

import { useState, useRef } from "react";
import { GripVertical } from "lucide-react";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { Button } from "@/style/components/button";

export function NewSequenceForm({
  selectedGroups,
  onSaveAction,
  onCancelAction,
}: {
  selectedGroups: AssignmentGroup[];
  onSaveAction: (label: string, orderedGroupIds: string[]) => void;
  onCancelAction: () => void;
}) {
  const [label, setLabel] = useState("");
  const [orderedGroups, setOrderedGroups] = useState<AssignmentGroup[]>(selectedGroups);
  const dragIndexRef = useRef<number | null>(null);

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    const next = [...orderedGroups];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    dragIndexRef.current = index;
    setOrderedGroups(next);
  }

  function handleDrop() {
    dragIndexRef.current = null;
  }

  function handleSave() {
    const trimmed = label.trim();
    if (!trimmed) return;
    onSaveAction(trimmed, orderedGroups.map((g) => g.groupId));
  }

  return (
    <div className="border border-border rounded bg-card p-3 space-y-3">
      <p className="text-[10px] font-semibold text-foreground uppercase tracking-wide">
        New Sequence
      </p>

      {/* Label input */}
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground">Label (required)</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") onCancelAction();
          }}
          placeholder="e.g. Lawn Renovation"
          autoFocus
          className="h-6 text-[10px] px-2 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full"
        />
      </div>

      {/* Drag-to-reorder group list */}
      <div className="space-y-0.5">
        <p className="text-[10px] text-muted-foreground">Order (drag to reorder)</p>
        {orderedGroups.map((group, index) => (
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
            <div className="flex flex-wrap gap-0.5 ml-1">
              {group.servCodeIds.map((id) => (
                <span
                  key={id}
                  className="font-mono text-[8px] text-primary/70 bg-primary/10 rounded px-0.5"
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          intensity="solid"
          disabled={!label.trim()}
          onClick={handleSave}
          className="h-6 text-[10px]"
        >
          Create Sequence
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
