"use client";

import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { upsellPrioritiesSelect } from "../upsellPrioritiesSelect";
import { upsellPrioritiesActions } from "../upsellPrioritiesSlice";
import type { UpsellPriority } from "../upsellPrioritiesTypes";
import { AvailableProgramsPanel } from "./AvailableProgramsPanel";
import { UpsellPriorityRow } from "./UpsellPriorityRow";

export function UpsellPrioritiesPage() {
  const dispatch = useAppDispatch();
  const draft = useSelector(upsellPrioritiesSelect.draft);
  const priorities = useSelector(upsellPrioritiesSelect.priorities);

  // progCodeIds in display order while a drag is in flight; null otherwise, so the
  // store stays the source of truth and Open / Save As replace the list cleanly.
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const displayedPriorities: UpsellPriority[] = dragOrder
    ? dragOrder
        .map((id) => priorities.find((p) => p.progCodeId === id))
        .filter((p): p is UpsellPriority => p !== undefined)
    : priorities;

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
    setDragOrder(priorities.map((p) => p.progCodeId));
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === index || !dragOrder) return;
    const next = [...dragOrder];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    dragIndexRef.current = index;
    setDragOrder(next);
  }

  function handleDrop() {
    dragIndexRef.current = null;
    if (dragOrder && draft) {
      const reordered = displayedPriorities.map(({ progCodeId, precludedBy }) => ({
        progCodeId,
        precludedBy,
      }));
      dispatch(upsellPrioritiesActions.reorderPriorities({ priorities: reordered }));
    }
    setDragOrder(null);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOrder(null);
  }

  return (
    <div className="h-full grid grid-cols-[18rem_1fr]">
      <AvailableProgramsPanel />

      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-2xl">
          {!draft ? (
            <p className="text-sm text-muted-foreground italic">
              Create or open an upsell priority list from the File menu.
            </p>
          ) : (
            <div className="rounded-md border border-border bg-card">
              <div className="px-3 py-2 border-b border-border">
                <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                  Upsell Priority
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  The first program the customer doesn&apos;t already have, and isn&apos;t precluded
                  from, is offered. Drag to reorder.
                </p>
              </div>
              {displayedPriorities.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-6 px-3">
                  No upsells yet. Pick programs from the list on the left.
                </p>
              ) : (
                displayedPriorities.map((priority, index) => (
                  <UpsellPriorityRow
                    key={priority.progCodeId}
                    priority={priority}
                    index={index}
                    onDragStartAction={handleDragStart}
                    onDragOverAction={handleDragOver}
                    onDropAction={handleDrop}
                    onDragEndAction={handleDragEnd}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
