"use client";

import { useSelector, useDispatch } from "react-redux";
import { format, parseISO, isValid } from "date-fns";
import { CalendarClock } from "lucide-react";
import { urgentActions } from "@/app/pace/priorities/urgentSlice";
import { AppDispatch, AppState } from "@/store";
import { PriorityService } from "@/app/priorityService/PriorityServiceTypes";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { Checkbox } from "@/style/components/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { ServiceTechNotesPopover } from "@/components/ServiceTechNotesPopover";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const selectCheckedServIds = (state: AppState): number[] => state.paceUrgent.checkedServIds;

function formatDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "M/d/yyyy");
  } catch {
    return isoDate;
  }
}

function formatDateDisplay(ps: PriorityService): string {
  if (ps.date) return formatDate(ps.date);
  if (ps.dateRange) {
    return `${formatDate(ps.dateRange.min)}–${formatDate(ps.dateRange.max)}`;
  }
  return "";
}

function formatSchedDate(isoDate: string): string {
  try {
    const d = parseISO(isoDate);
    return isValid(d) ? format(d, "EEE M/d") : isoDate;
  } catch {
    return isoDate;
  }
}

// ---------------------------------------------------------------------------
// PriorityServiceRow — one row in the checklist
// ---------------------------------------------------------------------------

function PriorityServiceRow({ ps }: { ps: PriorityService }) {
  const dispatch = useDispatch<AppDispatch>();
  const checkedServIds = useSelector(selectCheckedServIds);

  const service = ps.service;
  const customer = service.program.customer;
  const city = customer.address.city ?? "";
  const zip = customer.address.zip ?? "";
  const location = [zip, city].filter(Boolean).join(" ");

  // "$" = printed/scheduled → visually checked without storing in Redux
  const isScheduled = service.status === "$";
  const isChecked = checkedServIds.includes(service.servId) || isScheduled;

  const isAsap = service.status === "*";
  const isPromised = service.isPromised;
  const hasBadges = isAsap || isPromised;

  return (
    <div className="flex flex-col py-0.5 border-b border-border/20 last:border-0">
      {/* Main row */}
      <div className="flex items-center gap-1.5 text-xs">
        <Checkbox
          checked={isChecked}
          disabled={isScheduled}
          onCheckedChange={() => {
            if (!isScheduled) {
              dispatch(urgentActions.toggleChecked(service.servId));
            }
          }}
          className="shrink-0"
        />

        {/* Customer name */}
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

        {/* ServCode */}
        <span className="font-mono text-xs text-foreground shrink-0">
          {service.servCode.servCodeId}
        </span>

        {/* Date */}
        <span className="text-xs text-foreground shrink-0 tabular-nums">
          {formatDateDisplay(ps)}
        </span>

        <ServiceTechNotesPopover service={service} extraNote={ps.note ?? undefined} />
      </div>

      {/* Badge row */}
      {hasBadges && (
        <div className="flex gap-1 pl-[calc(1rem+0.375rem)]">
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
        return (
          <div className="pl-[calc(1rem+0.375rem)] text-xs text-foreground tabular-nums">
            {si.hasAssignment
              ? `$ ${si.employeeId} · ${formatSchedDate(si.schedDate)} · Stop ${si.sequence}`
              : formatSchedDate(si.schedDate)}
          </div>
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PriorityChecklistContent — accordion by date, collapsed by default
// ---------------------------------------------------------------------------

export function PriorityChecklistContent({
  priorityServices,
}: {
  priorityServices: PriorityService[];
}) {
  // Group by start date (date or dateRange.min) — selector already sorted ascending.
  const groups: { dateKey: string; label: string; priorityServices: PriorityService[] }[] = [];
  for (const ps of priorityServices) {
    const dateKey = ps.date ?? ps.dateRange?.min ?? "";
    const label = formatDate(dateKey);
    const existing = groups.find((g) => g.dateKey === dateKey);
    if (existing) {
      existing.priorityServices.push(ps);
    } else {
      groups.push({ dateKey, label, priorityServices: [ps] });
    }
  }

  if (groups.length === 0) return null;

  return (
    <Accordion type="multiple" className="w-full">
      {groups.map((group) => (
        <AccordionItem
          key={group.dateKey}
          value={group.dateKey}
          className="border-b border-border/40 last:border-0"
        >
          <AccordionTrigger className="py-2 px-3 text-xs hover:no-underline hover:bg-accent/10 [&[data-state=open]>svg]:rotate-180">
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <CalendarClock className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-semibold text-foreground tabular-nums">
                {group.label}
              </span>
              <span className="text-muted-foreground shrink-0">
                {group.priorityServices.length} service{group.priorityServices.length !== 1 ? "s" : ""}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-2 pt-0">
            <div>
              {group.priorityServices.map((ps) => (
                <PriorityServiceRow key={ps.servId} ps={ps} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
