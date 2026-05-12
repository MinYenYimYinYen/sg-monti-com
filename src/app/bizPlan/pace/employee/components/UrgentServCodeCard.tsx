"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelectRefactor";
import { ServCodePace } from "@/app/bizPlan/pace/PaceTypesRefactor";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { Number } from "@/components/Number";
import { LandPlot, AlertTriangle, Clock, Info } from "lucide-react";
import { cn } from "@/style/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/style/components/tooltip";

// ---------------------------------------------------------------------------
// UrgentServiceList — popover body listing unfinished services for a servCode
//
// Printed ("$") services are excluded — they are already scheduled/routed and
// the production manager should not be looking for work that is already on a route.
// ---------------------------------------------------------------------------

const URGENT_DISPLAY_STATUSES = getServiceStatuses(["active", "asap"]);

function UrgentServiceList({ services }: { services: Service[] }) {
  const unfinished = services.filter((s) =>
    URGENT_DISPLAY_STATUSES.includes(s.status),
  );

  if (unfinished.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-1">
        No unfinished services
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {unfinished.map((service) => {
        const customer = service.program.customer;
        const city = customer.address.city ?? "";
        const zip = customer.address.zip ?? "";
        const allTechNotes = service.x.allTechNotes;

        return (
          <div
            key={service.servId}
            className="flex items-start gap-2 text-xs py-1 border-b border-border/40 last:border-0"
          >
            {/* Customer link */}
            <div className="flex-1 min-w-0">
              <CustomerLink
                customerId={customer.custId}
                customerTab="customer"
                className="font-medium text-primary hover:underline truncate block"
              >
                {customer.displayName}
              </CustomerLink>
              <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                <span>{city}</span>
                {zip && <span className="text-muted-foreground/60">·</span>}
                <span>{zip}</span>
              </div>
            </div>

            {/* Size */}
            <span className="flex items-center gap-0.5 text-muted-foreground shrink-0">
              <LandPlot className="w-3 h-3" />
              <Number decimals={0}>{service.size}</Number>
            </span>

            {/* Tech notes — info icon with tooltip showing cust/prog/serv notes side-by-side */}
            {allTechNotes.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground shrink-0 cursor-default">
                      <Info className="size-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="p-0 max-w-none">
                    <div className="flex gap-2 p-2">
                      {allTechNotes.map((techNote, idx) => (
                        <div key={idx} className="w-72 text-xs whitespace-pre-wrap">
                          {techNote}
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// UrgentServCodeRow — one row per servCode with popover trigger
// ---------------------------------------------------------------------------

function UrgentServCodeRow({ pace }: { pace: ServCodePace }) {
  const [open, setOpen] = useState(false);
  const { servCode, category, unfinishedCSP } = pace;
  const isAsap = category === "asap";

  const unprintedCount = servCode.services.filter((s) =>
    URGENT_DISPLAY_STATUSES.includes(s.status),
  ).length;
  if (unprintedCount === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full text-left py-1.5 flex items-center gap-2 hover:bg-accent/10 rounded px-1 transition-colors">
          {/* Category icon */}
          {isAsap ? (
            <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
          ) : (
            <Clock className="w-3 h-3 text-destructive shrink-0" />
          )}

          {/* ServCode ID */}
          <span className="font-mono text-xs text-foreground flex-1 truncate">
            {servCode.servCodeId}
          </span>

          {/* Category badge */}
          <span
            className={cn(
              "text-[9px] font-semibold uppercase tracking-wide px-1 rounded shrink-0",
              isAsap
                ? "bg-destructive/20 text-destructive"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {isAsap ? "ASAP" : "LATE"}
          </span>

          {/* Unfinished count — excludes printed (already routed) */}
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            <Number decimals={0}>
              {
                servCode.services.filter((s) =>
                  URGENT_DISPLAY_STATUSES.includes(s.status),
                ).length
              }
            </Number>
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="start">
        <div className="bg-popover">
          <div className="bg-destructive/10">
            {/* Popover header */}
            <div className="px-3 py-2 border-b">
              <p className="text-xs font-semibold text-foreground font-mono">
                {servCode.servCodeId}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {servCode.progCode.progCodeId}
              </p>
            </div>
            {/* Service list */}
            <div className="px-3 py-2 max-h-72 overflow-y-auto">
              <UrgentServiceList services={servCode.services} />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// UrgentServCodeCard — the main export
// ---------------------------------------------------------------------------

export function UrgentServCodeCard() {
  const urgentPaces = useSelector(paceSelect.urgentServCodePaces);

  if (urgentPaces.length === 0) return null;

  return (
    <div className="border rounded-lg bg-card w-72 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b rounded-t-lg bg-destructive/10">
        <span className="text-sm font-semibold text-destructive flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" />
          Urgent
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {urgentPaces.length} servCode{urgentPaces.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Rows */}
      <div className="flex-1 px-2 py-1 divide-y divide-border/30">
        {urgentPaces.map((pace) => (
          <UrgentServCodeRow key={pace.servCode.servCodeId} pace={pace} />
        ))}
      </div>
    </div>
  );
}
