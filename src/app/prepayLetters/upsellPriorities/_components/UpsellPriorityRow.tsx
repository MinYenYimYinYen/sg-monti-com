"use client";

import { GripVertical, X } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { upsellPrioritiesActions } from "../upsellPrioritiesSlice";
import type { UpsellPriority } from "../upsellPrioritiesTypes";
import { PrecludedByPopover } from "./PrecludedByPopover";

type UpsellPriorityRowProps = {
  priority: UpsellPriority;
  index: number;
  onDragStartAction: (index: number) => void;
  onDragOverAction: (e: React.DragEvent, index: number) => void;
  onDropAction: () => void;
  onDragEndAction: () => void;
};

export function UpsellPriorityRow({
  priority,
  index,
  onDragStartAction,
  onDragOverAction,
  onDropAction,
  onDragEndAction,
}: UpsellPriorityRowProps) {
  const dispatch = useAppDispatch();
  const { progCodeId, precludedBy, progCode, precludedByProgCodes } = priority;

  return (
    <div
      draggable
      onDragStart={() => onDragStartAction(index)}
      onDragOver={(e) => onDragOverAction(e, index)}
      onDrop={onDropAction}
      onDragEnd={onDragEndAction}
      className="flex items-start gap-2 px-3 py-2 border-b border-border/50 hover:bg-accent/5 cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/40 shrink-0" />
      <span className="text-[10px] text-muted-foreground w-4 mt-1 shrink-0">{index + 1}</span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs font-semibold text-primary">{progCodeId}</span>
          <span className="text-[10px] text-muted-foreground truncate">
            {progCode?.description ?? "Unknown program"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 mt-1">
          <span className="text-[10px] text-muted-foreground">Precluded by</span>
          {precludedBy.length === 0 && (
            <span className="text-[10px] text-muted-foreground/60 italic">nothing</span>
          )}
          {precludedBy.map((precludingId) => {
            const precludingProgCode = precludedByProgCodes.find(
              (p) => p.progCodeId === precludingId,
            );
            return (
              <span
                key={precludingId}
                title={precludingProgCode?.description}
                className="inline-flex items-center gap-0.5 font-mono text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5"
              >
                {precludingId}
                <button
                  type="button"
                  onClick={() =>
                    dispatch(
                      upsellPrioritiesActions.setPrecludedBy({
                        progCodeId,
                        precludedBy: precludedBy.filter((id) => id !== precludingId),
                      }),
                    )
                  }
                  className="hover:text-destructive"
                  title="Remove"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
          <PrecludedByPopover progCodeId={progCodeId} precludedBy={precludedBy} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => dispatch(upsellPrioritiesActions.removePriority({ progCodeId }))}
        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        title="Remove from list"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
