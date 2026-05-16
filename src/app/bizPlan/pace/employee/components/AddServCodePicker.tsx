"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { PaceCategory } from "@/app/bizPlan/pace/PaceTypes";
import { CATEGORY_BADGE_STYLES } from "@/app/bizPlan/pace/paceStyles";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Button } from "@/style/components/button";
import { Checkbox } from "@/style/components/checkbox";
import { ScrollArea } from "@/style/components/scroll-area";
import { ChevronDown } from "lucide-react";
import { cn } from "@/style/utils";

const CATEGORY_LABELS: Record<PaceCategory, string> = {
  asap: "ASAP",
  overdue: "Overdue",
  inProgress: "In Progress",
  notStarted: "Not Started",
  notSet: "No Dates",
};

type AddServCodePickerProps = {
  employeeId: string;
  /** ServCode IDs already assigned to this employee — excluded from the picker */
  assignedServCodeIds: string[];
  onConfirmAction: (servCodeIds: string[]) => void;
};

export function AddServCodePicker({
  employeeId: _employeeId,
  assignedServCodeIds,
  onConfirmAction,
}: AddServCodePickerProps) {
  const [open, setOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const servCodePaces = useSelector(paceSelect.servCodePaces);

  // Only show servCodes not already assigned to this employee
  const assignedSet = new Set(assignedServCodeIds);
  const available = servCodePaces.filter(
    (p) => !assignedSet.has(p.servCode.servCodeId),
  );

  function togglePending(servCodeId: string) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(servCodeId)) {
        next.delete(servCodeId);
      } else {
        next.add(servCodeId);
      }
      return next;
    });
  }

  function handleConfirm() {
    onConfirmAction(Array.from(pendingIds));
    setPendingIds(new Set());
    setOpen(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setPendingIds(new Set());
    setOpen(nextOpen);
  }

  if (available.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="accent"
          intensity="ghost"
          size="sm"
          className="self-start h-7 text-xs gap-1"
        >
          Add servCode
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="h-56 rounded-md">
          <ScrollArea className="h-full p-1">
            <div className="space-y-0.5 pr-2">
              {available.map((pace) => (
                <label
                  key={pace.servCode.servCodeId}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/10 cursor-pointer"
                >
                  <Checkbox
                    checked={pendingIds.has(pace.servCode.servCodeId)}
                    onCheckedChange={() =>
                      togglePending(pace.servCode.servCodeId)
                    }
                  />
                  <span className="font-mono text-xs text-foreground">
                    {pace.servCode.servCodeId}
                  </span>
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center rounded px-1 py-0 text-[10px] font-medium",
                      CATEGORY_BADGE_STYLES[pace.category],
                    )}
                  >
                    {CATEGORY_LABELS[pace.category]}
                  </span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="mt-2 pt-2 border-t flex justify-end">
          <Button
            size="sm"
            variant="primary"
            intensity="solid"
            disabled={pendingIds.size === 0}
            onClick={handleConfirm}
            className="h-7 text-xs"
          >
            Add {pendingIds.size > 0 ? `(${pendingIds.size})` : ""}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
