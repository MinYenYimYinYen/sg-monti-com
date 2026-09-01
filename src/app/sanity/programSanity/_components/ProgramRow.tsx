"use client";

import { Info } from "lucide-react";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Button } from "@/style/components/button";

type ProgramRowProps = {
  program: Program;
};

export function ProgramRow({ program }: ProgramRowProps) {
  const { customer } = program;
  const soldBy = program.soldBy.join(", ");
  const techNotes = program.x.serviceQuery.results
    .map((s) => s.x.techNotes)
    .filter(
      (n) => n.servNote || n.progNote || n.custNote,
    );

  const hasNotes =
    program.techNote.length > 0 ||
    customer.techNote.length > 0 ||
    techNotes.some((n) => n.servNote);

  const isAutoRenew = customer.x.isAutoRenew;
  const isDontAutoRenew = customer.x.isDontAutoRenew;

  const autoRenewFlag = isAutoRenew
    ? customer.flags.find((f) => f.flagId === customer.x.renewalFlagIds?.autoRenew)
    : null;
  const dontAutoRenewFlag = isDontAutoRenew
    ? customer.flags.find((f) => f.flagId === customer.x.renewalFlagIds?.dontAutoRenew)
    : null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card text-sm">
      <CustomerLink
        customerId={customer.custId}
        customerTab="customer"
        className="font-medium text-primary hover:underline truncate flex-1"
      >
        {customer.displayName}
      </CustomerLink>

      {isAutoRenew && (
        <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
          {autoRenewFlag?.desc ?? "Auto Renew"}
        </span>
      )}

      {isDontAutoRenew && (
        <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
          {dontAutoRenewFlag?.desc ?? "Don't Auto Renew"}
        </span>
      )}

      <span className="text-muted-foreground shrink-0 text-xs">
        {program.dateSold
          ? `Sold: ${prettyDate(program.dateSold, "M/d/yyyy", { fallback: program.dateSold })}`
          : "No sold date"}
      </span>

      {soldBy && (
        <span className="text-muted-foreground shrink-0 text-xs">
          By: {soldBy}
        </span>
      )}

      {hasNotes && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="primary"
              intensity="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Info className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 text-xs space-y-2" align="end">
            {customer.techNote && (
              <div>
                <p className="font-semibold text-foreground mb-0.5">Customer Note</p>
                <p className="text-muted-foreground">{customer.techNote}</p>
              </div>
            )}
            {program.techNote && (
              <div>
                <p className="font-semibold text-foreground mb-0.5">
                  Program Note ({program.progCode.progCodeId})
                </p>
                <p className="text-muted-foreground">{program.techNote}</p>
              </div>
            )}
            {techNotes.map((notes, i) =>
              notes.servNote ? (
                <div key={i}>
                  <p className="font-semibold text-foreground mb-0.5">Service Note</p>
                  <p className="text-muted-foreground">{notes.servNote}</p>
                </div>
              ) : null,
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
