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
  onDeleteAction,
  onUpdateLabelAction,
  onUpdateDaysSinceAction,
  onReorderGroupsAction,
}: {
  sequence: GroupSequence;
  groupMap: Map<string, AssignmentGroup>;
  onDeleteAction: (sequenceId: string) => void;
  onUpdateLabelAction: (sequenceId: string, label: string) => void;
  onUpdateDaysSinceAction: (sequenceId: string, daysSince: number | null) => void; // null → 0 (no constraint)
  onReorderGroupsAction: (sequenceId: string, groupIds: string[]) => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(sequence.label);
  const [editingDaysSince, setEditingDaysSince] = useState(false);
  const [daysSinceDraft, setDaysSinceDraft] = useState<string>(
    sequence.daysSince > 0 ? String(sequence.daysSince) : "",
  );
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
    onReorderGroupsAction(sequence.sequenceId, localGroupIds);
  }

  function handleSaveDaysSince() {
    const parsed = daysSinceDraft.trim() !== "" ? parseInt(daysSinceDraft, 10) : null;
    const valid = parsed !== null && !isNaN(parsed) && parsed > 0 ? parsed : null;
    onUpdateDaysSinceAction(sequence.sequenceId, valid);
    setEditingDaysSince(false);
  }

  return (
    <AccordionItem value={sequence.sequenceId} className="border-b border-border/50">
      {/* Header row — label + delete. No nested buttons inside AccordionTrigger. */}
      <div className="flex items-center px-3 py-2 hover:bg-accent/5">
        <AccordionTrigger className="flex-1 min-w-0 text-xs hover:no-underline [&[data-state=open]>svg]:rotate-180 p-0">
          {editingLabel ? (
            <div
              className="flex items-center gap-1 flex-1 min-w-0 mr-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onUpdateLabelAction(sequence.sequenceId, labelDraft.trim() || sequence.label);
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
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateLabelAction(sequence.sequenceId, labelDraft.trim() || sequence.label);
                  setEditingLabel(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && onUpdateLabelAction(sequence.sequenceId, labelDraft.trim() || sequence.label)}
                className="p-0.5 rounded text-accent hover:bg-accent/10 shrink-0 cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setLabelDraft(sequence.label);
                  setEditingLabel(false);
                }}
                className="p-0.5 rounded text-muted-foreground hover:bg-accent/10 shrink-0 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
              <span className="text-xs font-semibold text-foreground truncate">
                {sequence.label}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingLabel(true);
                  setLabelDraft(sequence.label);
                }}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors shrink-0 cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
              </span>
            </div>
          )}
        </AccordionTrigger>

        {/* Delete control — sibling of AccordionTrigger, not nested inside it */}
        <div className="shrink-0 ml-1">
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  onDeleteAction(sequence.sequenceId);
                  setConfirmDelete(false);
                }}
                className="text-[9px] text-destructive font-semibold hover:underline cursor-pointer"
              >
                Del
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={() => setConfirmDelete(false)}
                className="text-[9px] text-muted-foreground hover:underline cursor-pointer"
              >
                ✕
              </span>
            </div>
          ) : (
            <span
              role="button"
              tabIndex={0}
              onClick={() => setConfirmDelete(true)}
              className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

      <AccordionContent className="pb-0">
        <div className="px-3 pb-2 space-y-1.5">
          {/* Days since constraint editor */}
          {sequence.groupIds.length > 1 && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-muted-foreground shrink-0">Days between rounds:</span>
              {editingDaysSince ? (
                <>
                  <input
                    type="number"
                    min={1}
                    value={daysSinceDraft}
                    onChange={(e) => setDaysSinceDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveDaysSince();
                      if (e.key === "Escape") setEditingDaysSince(false);
                    }}
                    autoFocus
                    placeholder="none"
                    className="h-5 w-16 text-[10px] px-1.5 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleSaveDaysSince}
                    className="p-0.5 rounded text-accent hover:bg-accent/10 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => setEditingDaysSince(false)}
                    className="p-0.5 rounded text-muted-foreground hover:bg-accent/10 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </>
              ) : (
                <>
                  <span className={sequence.daysSince > 0 ? "text-foreground font-medium" : "text-muted-foreground/60"}>
                    {sequence.daysSince > 0 ? `${sequence.daysSince} days` : "none"}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setEditingDaysSince(true);
                      setDaysSinceDraft(sequence.daysSince > 0 ? String(sequence.daysSince) : "");
                    }}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                  </span>
                </>
              )}
            </div>
          )}

          {/* Drag-to-reorder group list */}
          <div className="space-y-0.5">
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
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
