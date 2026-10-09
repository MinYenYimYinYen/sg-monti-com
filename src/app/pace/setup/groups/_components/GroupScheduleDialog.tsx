"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { paceSeasonPlanSelect } from "@/app/pace/seasonPlan/seasonPlanSelect";
import { usePaceSeasonPlan } from "@/app/pace/seasonPlan/useSeasonPlan";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";

type GroupScheduleDialogProps = {
  group: AssignmentGroup;
  open: boolean;
  onCloseAction: () => void;
};

export function GroupScheduleDialog({ group, open, onCloseAction }: GroupScheduleDialogProps) {
  const activeSeasonPlan = useSelector(paceSeasonPlanSelect.activeSeasonPlan);
  const { upsertSeasonPlan } = usePaceSeasonPlan();

  const existingSchedule = activeSeasonPlan?.groupSchedules.find(
    (s) => s.groupId === group.groupId,
  );

  const [plannedStart, setPlannedStart] = useState(existingSchedule?.plannedStart ?? "");
  const [plannedEnd, setPlannedEnd] = useState(existingSchedule?.plannedEnd ?? "");

  const isValid =
    plannedStart.length > 0 &&
    plannedEnd.length > 0 &&
    plannedStart < plannedEnd;

  async function handleSave() {
    if (!activeSeasonPlan || !isValid) return;

    const updatedSchedules = activeSeasonPlan.groupSchedules.filter(
      (s) => s.groupId !== group.groupId,
    );
    updatedSchedules.push({
      groupId: group.groupId,
      plannedStart,
      plannedEnd,
    });

    await upsertSeasonPlan({
      ...activeSeasonPlan,
      groupSchedules: updatedSchedules,
    });

    onCloseAction();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCloseAction(); }}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Schedule —</span>
            <span className="font-mono text-primary">{group.label}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {!activeSeasonPlan ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                No active season plan. Create one on the Season Plan page first.
              </p>
              <Link
                href="/pace/seasonPlan"
                className="text-xs text-primary hover:underline"
                onClick={onCloseAction}
              >
                Go to Season Plan →
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Start date</label>
                <input
                  type="date"
                  value={plannedStart}
                  onChange={(e) => setPlannedStart(e.target.value)}
                  className="h-8 w-full text-xs px-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">End date</label>
                <input
                  type="date"
                  value={plannedEnd}
                  onChange={(e) => setPlannedEnd(e.target.value)}
                  className="h-8 w-full text-xs px-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {plannedStart && plannedEnd && plannedStart >= plannedEnd && (
                <p className="text-[10px] text-destructive">
                  End date must be after start date.
                </p>
              )}

              <div className="pt-1">
                <Link
                  href="/pace/seasonPlan"
                  className="text-[10px] text-muted-foreground hover:text-primary hover:underline transition-colors"
                  onClick={onCloseAction}
                >
                  Go to Season Plan →
                </Link>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCloseAction}>
            Cancel
          </Button>
          {activeSeasonPlan && (
            <Button
              variant="primary"
              intensity="solid"
              size="sm"
              disabled={!isValid}
              onClick={() => { void handleSave(); }}
            >
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
