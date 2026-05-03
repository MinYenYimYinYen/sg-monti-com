"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { paceActions } from "@/app/bizPlan/pace/paceSlice";
import { ProgCodePaceItem } from "@/app/bizPlan/pace/components/ProgCodePaceItem";
import { PaceDisplayConfig } from "@/app/bizPlan/pace/components/PaceDisplayConfig";
import { ScrollArea } from "@/style/components/scroll-area";
import { cn } from "@/style/utils";

function useSelectProgCode() {
  const dispatch = useAppDispatch();
  return (progCodeId: string, servCodeIds: string[]) => {
    dispatch(paceActions.setSelectedServCodeIds(servCodeIds));
    dispatch(paceActions.setSelectionSource("progCode"));
    dispatch(paceActions.setSelectedProgCodeId(progCodeId));
  };
}

function useSelectAllInProgress() {
  const dispatch = useAppDispatch();
  return (servCodeIds: string[]) => {
    dispatch(paceActions.setSelectedServCodeIds(servCodeIds));
    dispatch(paceActions.setSelectionSource("allInProgress"));
    dispatch(paceActions.setSelectedProgCodeId(null));
  };
}

export function PaceListPanel() {
  const selectionSource = useSelector(paceSelect.selectionSource);
  const selectedProgCodeId = useSelector(paceSelect.selectedProgCodeId);
  const progCodePaces = useSelector(paceSelect.filteredSortedProgCodePaces);
  const activeServCodeIds = useSelector(paceSelect.activeServCodeIds);

  const selectProgCode = useSelectProgCode();
  const selectAllInProgress = useSelectAllInProgress();

  const allInProgressSelected = selectionSource === "allInProgress";

  return (
    <div className="w-100 shrink-0 flex flex-col gap-2 h-full">
      <PaceDisplayConfig />

      {/* List */}
      <ScrollArea className="rounded-md border bg-popover flex-1 min-h-0">
        <div className="p-1 space-y-0.5">
          {/* "All Active" pseudo-item — includes asap, overdue, and inProgress */}
          <button
            onClick={() => selectAllInProgress(activeServCodeIds)}
            className={cn(
              "w-full text-left px-2.5 py-2 rounded-md transition-colors border",
              allInProgressSelected
                ? "bg-primary/15 border-primary/30"
                : "hover:bg-accent/10 border-transparent",
            )}
          >
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-mono text-xs shrink-0 text-foreground">
                All Active
              </span>
            </div>
            <div className="text-[12px] text-muted-foreground mt-0.5">
              {activeServCodeIds.length} service code
              {activeServCodeIds.length !== 1 ? "s" : ""}
            </div>
          </button>

          {/* ProgCode items */}
          {progCodePaces.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No programs match the current filters
            </p>
          ) : (
            progCodePaces.map((pace) => (
              <ProgCodePaceItem
                key={pace.progCode.progCodeId}
                pace={pace}
                isSelected={
                  selectionSource === "progCode" &&
                  selectedProgCodeId === pace.progCode.progCodeId
                }
                onSelectAction={selectProgCode}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
