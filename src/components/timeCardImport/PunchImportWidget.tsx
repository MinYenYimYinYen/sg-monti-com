"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Upload } from "lucide-react";
import { Button } from "@/style/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/style/components/sheet";
import { PunchImportPanel } from "@/app/timeCard/import/_components/PunchImportPanel";
import { timeCardImportActions } from "@/app/timeCard/import/timeCardImportSlice";
import { timeCardImportSelect } from "@/app/timeCard/import/timeCardImportSelect";
import { timeCardSelect } from "@/app/timeCard/timeCardSelect";
import { useTimeCard } from "@/app/timeCard/useTimeCard";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";

/**
 * Compact trigger button + Sheet that houses PunchImportPanel.
 * Sheet open state is stored in Redux so it survives navigation
 * (e.g., when the user leaves to generate a CSV in the external CRM).
 */
export function PunchImportWidget() {
  const dispatch = useAppDispatch();
  const isOpen = useSelector(timeCardImportSelect.isImportSheetOpen);
  const lastImportedDate = useSelector(timeCardSelect.lastImportedDate);
  const { fetchLastImportedDate } = useTimeCard();

  useEffect(() => {
    fetchLastImportedDate();
  }, [fetchLastImportedDate]);

  const lastImportedLabel = lastImportedDate
    ? prettyDate(lastImportedDate, "MMM d yyyy")
    : null;

  const handleOpenChange = (open: boolean) => {
    if (open) {
      dispatch(timeCardImportActions.openImportSheet());
    } else {
      dispatch(timeCardImportActions.closeImportSheet());
    }
  };

  return (
    <>
      <Button
        variant="outline"
        intensity="soft"
        size="sm"
        onClick={() => dispatch(timeCardImportActions.openImportSheet())}
      >
        <Upload className="h-3.5 w-3.5 mr-1.5" />
        Time Cards
        {lastImportedLabel && (
          <span className="ml-1.5 text-muted-foreground font-normal">
            — {lastImportedLabel}
          </span>
        )}
      </Button>

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-[min(90vw,800px)] sm:max-w-none overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Import Time Cards</SheetTitle>
          </SheetHeader>
          <PunchImportPanel />
        </SheetContent>
      </Sheet>
    </>
  );
}
