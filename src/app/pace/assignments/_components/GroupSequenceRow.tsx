"use client";

import { useState, useRef } from "react";
import { Check, GripVertical, Pencil, X } from "lucide-react";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";

export function GroupSequenceRow({
  sequence,
  groupMap,
  onDelete,
  onUpdateLabel,
  onReorderGroups,
}: {
  sequence: GroupSequence;
  groupMap: Map<string, AssignmentGroup>;
  onDelete: (sequenceId: string) => void;
  onUpdateLabel: (sequenceId: string, label: string) => void;
  onReorderGroups: (sequenceId: string, groupIds: string[]) => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(sequence.label);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localGroupIds, setLocalGroupIds] = useState<string[]>(sequence.groupIds);
  const dragIndexRef = useRef<number | null>(null);

  // Keep local order in sync when sequence prop changes (e.g. after save)
  if (
    localGroupIds.length !== sequence.groupIds.length ||
    localGroupIds.some((id, i) => id !== sequence.groupIds[i])
  ) {
    setLocalGroupIds(sequence.groupIds);
  }

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    const next = [...localGroupIds];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    dragIndexRef.current = index;
    setLocalGroupIds(next);
  }

  function handleDrop() {
    dragIndexRef.current = null;
    onReorderGroups(sequence.sequenceId, localGroupIds);
  }

  return (
    <AccordionItem value={sequence.sequenceId} className="border-b border-border/50">
      <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline hover:bg-accent/5 [&[data-state=open]>svg]:rotate-180">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
          {editingLabel ? (
            <div
              className="flex items-center gap-1 flex-1 min-w-0"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onUpdateLabel(sequence.sequenceId, labelDraft.trim() || sequence.label);
                    setEditingLabel(false);
                  }
                  if (e.key === "Escape") {
                    setLabelDraft(sequence.label);
                    setEditingLabel(false);
                  }
                }}
                autoFocus
                className="h-5 text-[10px] px-1.5 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary flex-1 min-w-0"
              />
              <button
                onClick={() => {
                  onUpdateLabel(sequence.sequenceId, labelDraft.trim() || sequence.label);
                  setEditingLabel(false);
                }}
                className="p-0.5 rounded text-accent hover:bg-accent/10 shrink-0"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setLabelDraft(sequence.label);
                  setEditingLabel(false);
                }}
                className="p-0.5 rounded text-muted-foreground hover:bg-accent/10 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">
                {sequence.label}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingLabel(true);
                  setLabelDraft(sequence.label);
                }}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors shrink-0"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Delete control */}
          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    onDelete(sequence.sequenceId);
                    setConfirmDelete(false);
                  }}
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
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="pb-0">
        <div className="px-3 pb-2 space-y-0.5">
          {localGroupIds.map((groupId, index) => {
            const group = groupMap.get(groupId);
            const label = group?.label ?? groupId;
            return (
              <div
                key={groupId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-accent/10 cursor-grab active:cursor-grabbing group/row"
              >
                <GripVertical className="w-3 h-3 text-muted-foreground/50 group-hover/row:text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground w-3 shrink-0 text-right">
                  {index + 1}
                </span>
                <span className="font-mono text-[10px] font-semibold text-primary truncate">
                  {label}
                </span>
                <div className="flex flex-wrap gap-0.5 ml-1">
                  {group?.servCodeIds.map((id) => (
                    <span
                      key={id}
                      className="font-mono text-[8px] text-primary/70 bg-primary/10 rounded px-0.5"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
