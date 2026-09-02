"use client";

import { Wand2 } from "lucide-react";
import { Button } from "@/style/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { PromiseBuilder } from "@/app/schedPromise/PromiseBuilder";

type PromiseBuilderPopoverProps = {
  label: string;
  customerTechNote: string;
  programTechNote: string;
  serviceTechNote: string;
};

export function PromiseBuilderPopover({
  label,
  customerTechNote,
  programTechNote,
  serviceTechNote,
}: PromiseBuilderPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="primary"
          intensity="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          title={`Build promise note for ${label}`}
        >
          <Wand2 className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[640px] max-h-[80vh] overflow-y-auto p-0"
        align="start"
        side="right"
        sideOffset={8}
      >
        {/* Context notes */}
        <div className="px-4 pt-4 pb-3 border-b border-border space-y-1">
          <p className="text-xs font-semibold text-foreground">
            Build Promise — {label}
          </p>
          {customerTechNote && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground not-italic">Customer:</span>{" "}
              {customerTechNote}
            </p>
          )}
          {programTechNote && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground not-italic">Program:</span>{" "}
              {programTechNote}
            </p>
          )}
          {serviceTechNote && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground not-italic">Service:</span>{" "}
              {serviceTechNote}
            </p>
          )}
        </div>

        {/* Promise builder */}
        <PromiseBuilder />
      </PopoverContent>
    </Popover>
  );
}
