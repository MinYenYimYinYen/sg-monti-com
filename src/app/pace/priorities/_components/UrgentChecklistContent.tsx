"use client";

import { useSelector, useDispatch } from "react-redux";
import { format, parseISO, isValid } from "date-fns";
import { CalendarX, CircleHelp, LandPlot, Zap } from "lucide-react";
import { urgentActions } from "@/app/pace/priorities/urgentSlice";
import { AppDispatch, AppState } from "@/store";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { Number } from "@/components/Number";
import { cn } from "@/style/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { Checkbox } from "@/style/components/checkbox";
import { ServiceTechNotesPopover } from "@/components/ServiceTechNotesPopover";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UrgentReason =
  | { kind: "alwaysAsap" }
  | { kind: "overdue"; deadline: string }
  | { kind: "unplanned" };

export type UrgentServCode = {
  servCode: ServCodeDeep;
  reason: UrgentReason;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const selectCheckedServIds = (state: AppState): number[] => state.paceUrgent.checkedServIds;

function formatDeadline(isoDate: string): string {
  try {
    const d = parseISO(isoDate);
    return isValid(d) ? format(d, "M/d") : isoDate;
  } catch {
    return isoDate;
  }
}

function ReasonBadge({ reason }: { reason: UrgentReason }) {
  if (reason.kind === "alwaysAsap") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 bg-destructive/20 text-destructive font-medium leading-none text-[9px] shrink-0">
        <Zap className="w-2.5 h-2.5" />
        Always ASAP
      </span>
    );
  }
  if (reason.kind === "overdue") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 bg-destructive/10 text-destructive font-medium leading-none text-[9px] shrink-0">
        <CalendarX className="w-2.5 h-2.5" />
        Past plan end {formatDeadline(reason.deadline)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 bg-secondary/20 text-secondary font-medium leading-none text-[9px] shrink-0">
      <CircleHelp className="w-2.5 h-2.5" />
      Unplanned
    </span>
  );
}

// ---------------------------------------------------------------------------
// ChecklistServiceRow
// ---------------------------------------------------------------------------

function ChecklistServiceRow({
  service,
  servCodeId,
}: {
  service: Service;
  servCodeId: string;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const checkedServIds = useSelector(selectCheckedServIds);
  const checked = checkedServIds.includes(service.servId);

  const customer = service.program.customer;
  const city = customer.address.city ?? "";
  const zip = customer.address.zip ?? "";
  const location = [zip, city].filter(Boolean).join(" ");

  const isAsap = service.status === "*";
  const isPromised = service.isPromised;
  const hasBadges = isAsap || isPromised;

  return (
    <div
      className={cn(
        "flex flex-col py-0.5 border-b border-border/20 last:border-0",
        checked && "opacity-40",
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-1.5 text-xs">
        <Checkbox
          checked={checked}
          onCheckedChange={() => dispatch(urgentActions.toggleChecked(service.servId))}
          className="shrink-0"
        />
        <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-14 truncate">
          {servCodeId}
        </span>
        <span className="flex-1 min-w-0 truncate">
          <CustomerLink
            customerId={customer.custId}
            customerTab="customer"
            className="font-medium text-primary hover:underline"
          >
            {customer.displayName}
          </CustomerLink>
          {location && (
            <span className="text-muted-foreground"> · {location}</span>
          )}
        </span>
        <span className="flex items-center gap-0.5 text-muted-foreground shrink-0">
          <LandPlot className="w-3 h-3" />
          <Number decimals={0}>{service.size}</Number>
        </span>
        <ServiceTechNotesPopover service={service} />
      </div>

      {/* Badge row */}
      {hasBadges && (
        <div className="flex gap-1 pl-[calc(1rem+0.375rem+3.5rem+0.375rem)]">
          {isAsap && (
            <span className="rounded px-1 py-0.5 bg-destructive/20 text-destructive font-medium leading-none text-[9px]">
              ASAP
            </span>
          )}
          {isPromised && (
            <span className="rounded px-1 py-0.5 bg-secondary/20 text-secondary font-medium leading-none text-[9px]">
              Promised
            </span>
          )}
        </div>
      )}

      {/* Schedule info row (printed services only) */}
      {(() => {
        const si = service.x.schedInfo;
        if (!si) return null;
        const dateStr = (() => {
          try {
            const d = parseISO(si.schedDate);
            return isValid(d) ? format(d, "EEE M/d") : si.schedDate;
          } catch {
            return si.schedDate;
          }
        })();
        return (
          <div className="pl-[calc(1rem+0.375rem+3.5rem+0.375rem)] text-xs text-foreground tabular-nums">
            {si.hasAssignment
              ? `$ ${si.employeeId} · ${dateStr} · Stop ${si.sequence}`
              : dateStr}
          </div>
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// UrgentChecklistContent — full-page checklist (all expanded by default)
// ---------------------------------------------------------------------------

export function UrgentChecklistContent({
  urgentServCodes,
}: {
  urgentServCodes: UrgentServCode[];
}) {
  const allServCodeIds = urgentServCodes
    .filter((entry) => entry.servCode.services.some((s) => s.x.isActionable))
    .map((entry) => entry.servCode.servCodeId);

  return (
    <Accordion
      type="multiple"
      defaultValue={allServCodeIds}
      className="w-full"
    >
      {urgentServCodes.map((entry) => {
        const { servCode, reason } = entry;
        const unfinished = servCode.services.filter((s) => s.x.isActionable);
        if (unfinished.length === 0) return null;

        return (
          <AccordionItem
            key={servCode.servCodeId}
            value={servCode.servCodeId}
            className="border-b border-border/40 last:border-0"
          >
            <AccordionTrigger className="py-2 px-3 text-xs font-mono hover:no-underline hover:bg-accent/10 [&[data-state=open]>svg]:rotate-180">
              <span className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-semibold text-foreground truncate">
                  {servCode.servCodeId}
                </span>
                <ReasonBadge reason={reason} />
                <span className="text-muted-foreground shrink-0">
                  {unfinished.length} service{unfinished.length !== 1 ? "s" : ""}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-2 pt-0">
              <div>
                {unfinished.map((service) => (
                  <ChecklistServiceRow
                    key={service.servId}
                    service={service}
                    servCodeId={servCode.servCodeId}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
