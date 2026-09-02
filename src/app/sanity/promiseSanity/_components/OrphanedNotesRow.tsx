"use client";

import { OrphanedNote, OrphanedNoteLevel } from "@/app/sanity/promiseSanity/promiseSanitySelect";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { ProgramLink } from "@/app/realGreen/customer/components/ProgramLink";
import { useFullSeasonServices } from "@/app/realGreen/customer/hooks/useFullSeasonServices";
import { RefreshCw } from "lucide-react";
import { Button } from "@/style/components/button";

const LEVEL_LABELS: Record<OrphanedNoteLevel, string> = {
  customer: "Customer",
  program: "Program",
  service: "Service",
};

const LEVEL_CLASSES: Record<OrphanedNoteLevel, string> = {
  customer: "bg-destructive/10 text-destructive",
  program: "bg-secondary/10 text-secondary",
  service: "bg-accent/10 text-accent",
};

type OrphanedNotesRowProps = {
  orphanedNote: OrphanedNote;
};

export function OrphanedNotesRow({ orphanedNote }: OrphanedNotesRowProps) {
  const { level, customer, program, service, noteText } = orphanedNote;
  const { refreshCustomer, isRefreshingCustomer } = useFullSeasonServices();
  const isRefreshing = isRefreshingCustomer(customer.custId);

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Button
          variant="primary"
          intensity="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => refreshCustomer(customer.custId)}
          disabled={isRefreshing}
          title="Refresh customer data"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium shrink-0 ${LEVEL_CLASSES[level]}`}
        >
          {LEVEL_LABELS[level]}
        </span>
        <CustomerLink
          customerId={customer.custId}
          customerTab="customer"
          className="font-medium text-primary hover:underline"
        >
          {customer.displayName}
        </CustomerLink>
        {program && (
          <ProgramLink
            programId={program.progId}
            className="rounded px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary hover:underline font-mono"
          >
            {program.progCode.progCodeId}
          </ProgramLink>
        )}
        {service && (
          <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-accent/10 text-accent font-mono">
            {service.servCodeId}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground italic pl-8">{noteText}</p>
    </div>
  );
}
