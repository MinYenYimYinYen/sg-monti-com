"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { programSanitySelect } from "@/app/sanity/programSanity/programSanitySelect";
import { sanityActions } from "@/app/sanity/sanitySlice";
import { ProgramRow } from "@/app/sanity/programSanity/_components/ProgramRow";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Button } from "@/style/components/button";
import { CheckCircle } from "lucide-react";

export function ProgramSanityFinishedPopover() {
  const dispatch = useAppDispatch();
  const finishedPrograms = useSelector(programSanitySelect.finishedPrograms);
  const finishedCount = useSelector(programSanitySelect.finishedCount);
  const [confirmingClear, setConfirmingClear] = useState(false);

  if (finishedCount === 0) return null;

  const handleClearAll = () => {
    dispatch(sanityActions.clearProgramSanityFinished());
    setConfirmingClear(false);
  };

  return (
    <Popover onOpenChange={() => setConfirmingClear(false)}>
      <PopoverTrigger asChild>
        <Button
          variant="accent"
          intensity="ghost"
          size="sm"
          className="h-7 gap-1.5 shrink-0"
          title="View finished programs"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          <span className="text-xs">{finishedCount}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[520px] p-0 overflow-hidden"
        align="end"
        sideOffset={6}
      >
        {/* Popover header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <span className="text-sm font-semibold text-foreground">
            Finished Programs ({finishedCount})
          </span>
          {!confirmingClear ? (
            <Button
              variant="destructive"
              intensity="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setConfirmingClear(true)}
            >
              Clear All
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confirm?</span>
              <Button
                variant="destructive"
                intensity="solid"
                size="sm"
                className="h-6 text-xs"
                onClick={handleClearAll}
              >
                Yes
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setConfirmingClear(false)}
              >
                No
              </Button>
            </div>
          )}
        </div>

        {/* Scrollable list of finished programs */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-1">
          {finishedPrograms.map((program) => (
            <ProgramRow
              key={program.progId}
              program={program}
              mode="finished"
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
