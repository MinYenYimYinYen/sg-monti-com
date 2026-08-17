"use client";

import { useSelector } from "react-redux";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/style/components/button";
import { Number } from "@/components/Number";
import { minutesToHoursMinutes } from "@/lib/primatives/dates/minutesToHoursMinutes";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { productivitySelect } from "@/app/productivity/productivitySelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { AppState } from "@/store";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// Timeline item types
// ---------------------------------------------------------------------------

type ServiceItem = {
  kind: "service";
  service: Service;
  startTime: string;
  endTime: string;
  doneByPercent: number;
};

type GapItem = {
  kind: "gap";
  minutes: number;
  label: string;
};

type PunchItem = {
  kind: "punch-in" | "punch-out";
  time: string;
};

type TimelineItem = ServiceItem | GapItem | PunchItem;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeToMinutes(time: string): number {
  const parts = time.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  return h * 60 + m;
}

function formatTime(isoOrTime: string): string {
  const timePart = isoOrTime.includes("T") ? isoOrTime.split("T")[1] ?? "" : isoOrTime;
  if (!timePart || timePart === "00:00:00") return "";
  return timePart.slice(0, 5);
}

function extractTime(isoOrTime: string): string {
  return isoOrTime.includes("T") ? isoOrTime.split("T")[1] ?? "" : isoOrTime;
}

const SENTINEL_TIME = "00:00:00";

function hasRealTime(time: string): boolean {
  const t = extractTime(time);
  return t !== "" && t !== SENTINEL_TIME;
}

// ---------------------------------------------------------------------------
// Build timeline
// ---------------------------------------------------------------------------

function buildTimeline(
  services: Service[],
  empId: string,
  punchInTime: string | null,
  punchOutTime: string | null,
): { timeline: TimelineItem[]; unscheduled: Service[] } {
  const timed: ServiceItem[] = [];
  const unscheduled: Service[] = [];

  for (const service of services) {
    const startRaw = service.production?.timeRange.min ?? "";
    const endRaw = service.production?.timeRange.max ?? "";
    const startTime = extractTime(startRaw);
    const endTime = extractTime(endRaw);
    const doneBy = service.production?.doneBys.find((d) => d.employeeId === empId);

    if (hasRealTime(startRaw) && hasRealTime(endRaw)) {
      timed.push({
        kind: "service",
        service,
        startTime,
        endTime,
        doneByPercent: doneBy?.percent ?? 1,
      });
    } else {
      unscheduled.push(service);
    }
  }

  timed.sort((a, b) => a.startTime.localeCompare(b.startTime));

  const timeline: TimelineItem[] = [];

  if (punchInTime && hasRealTime(punchInTime)) {
    timeline.push({ kind: "punch-in", time: punchInTime });
    if (timed.length > 0) {
      const gapMin = timeToMinutes(timed[0]!.startTime) - timeToMinutes(punchInTime);
      if (gapMin > 0) {
        timeline.push({ kind: "gap", minutes: gapMin, label: "Before first stop" });
      }
    }
  }

  for (let i = 0; i < timed.length; i++) {
    const item = timed[i]!;
    timeline.push(item);
    if (i < timed.length - 1) {
      const gapMin = timeToMinutes(timed[i + 1]!.startTime) - timeToMinutes(item.endTime);
      if (gapMin > 0) {
        timeline.push({ kind: "gap", minutes: gapMin, label: "Between stops" });
      }
    }
  }

  if (punchOutTime && hasRealTime(punchOutTime)) {
    if (timed.length > 0) {
      const lastEnd = timed[timed.length - 1]!.endTime;
      const gapMin = timeToMinutes(punchOutTime) - timeToMinutes(lastEnd);
      if (gapMin > 0) {
        timeline.push({ kind: "gap", minutes: gapMin, label: "After last stop" });
      }
    }
    timeline.push({ kind: "punch-out", time: punchOutTime });
  }

  return { timeline, unscheduled };
}

// ---------------------------------------------------------------------------
// Item renderers
// ---------------------------------------------------------------------------

function PunchMarker({ item }: { item: PunchItem }) {
  const label = item.kind === "punch-in" ? "Punch In" : "Punch Out";
  const color = item.kind === "punch-in" ? "text-accent" : "text-secondary";
  return (
    <div className={cn("flex items-center gap-2 py-1 px-2 text-xs font-medium", color)}>
      <span className="font-mono">{formatTime(item.time)}</span>
      <span>{label}</span>
    </div>
  );
}

function GapMarker({ item }: { item: GapItem }) {
  return (
    <div className="flex items-center gap-2 py-0.5 px-2 text-xs text-muted-foreground italic">
      <span className="font-mono">{minutesToHoursMinutes(item.minutes)}</span>
      <span>{item.label}</span>
    </div>
  );
}

function ServiceCard({ item }: { item: ServiceItem }) {
  const { service, startTime, endTime, doneByPercent } = item;
  const revenue = service.x.getPriceAfterDiscounts("price") * doneByPercent;
  const size = service.size * doneByPercent;
  const custName = service.x.customer.displayName;
  const servCodeId = service.servCode.servCodeId;
  const durationMin = Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime));

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-medium text-foreground min-w-0">
          <span className="font-mono text-muted-foreground shrink-0">
            {formatTime(startTime)}–{formatTime(endTime)}
          </span>
          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0">
            {servCodeId}
          </span>
          <span className="truncate">{custName}</span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground shrink-0">
          {durationMin > 0 && (
            <span className="font-mono">{minutesToHoursMinutes(durationMin)}</span>
          )}
          <Number isMoney decimals={0}>{revenue}</Number>
          <span><Number decimals={0}>{size}</Number> sqft</span>
          {doneByPercent < 1 && (
            <span className="text-secondary text-[10px]">{Math.round(doneByPercent * 100)}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

function UnscheduledService({ service, empId }: { service: Service; empId: string }) {
  const doneBy = service.production?.doneBys.find((d) => d.employeeId === empId);
  const percent = doneBy?.percent ?? 1;
  const revenue = service.x.getPriceAfterDiscounts("price") * percent;
  const size = service.size * percent;
  const custName = service.x.customer.displayName;
  const servCodeId = service.servCode.servCodeId;

  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
        <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0">
          {servCodeId}
        </span>
        <span className="truncate">{custName}</span>
      </div>
      <div className="flex items-center gap-4 text-muted-foreground shrink-0">
        <Number isMoney decimals={0}>{revenue}</Number>
        <span><Number decimals={0}>{size}</Number> sqft</span>
        {percent < 1 && (
          <span className="text-secondary text-[10px]">{Math.round(percent * 100)}%</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Punch selector
// ---------------------------------------------------------------------------

const selectPunches = (state: AppState) => state.timeCard.docs;

// ---------------------------------------------------------------------------
// DayTimeline — shared component for employee+date detail view
// ---------------------------------------------------------------------------

type DayTimelineProps = {
  empId: string;
  date: string;
  /** Where the back button navigates. Caller sets this based on drill-in path. */
  backHref: string;
};

export function DayTimeline({ empId, date, backHref }: DayTimelineProps) {
  const servicesByEmployeeByDate = useSelector(productivitySelect.servicesByEmployeeByDate);
  const laborByEmployeeByDate = useSelector(productivitySelect.laborByEmployeeByDate);
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const punches = useSelector(selectPunches);

  const employee = employeeMap.get(empId);
  const services = servicesByEmployeeByDate.get(empId)?.get(date) ?? [];
  const dayMinutes = laborByEmployeeByDate.get(empId)?.get(date) ?? 0;

  const punch = punches.find((p) => p.employeeId === empId && p.punchDate === date);
  const punchInTime = punch?.segments[0]?.inTime ?? null;
  const punchOutTime = punch?.segments[punch.segments.length - 1]?.outTime ?? null;

  const { timeline, unscheduled } = buildTimeline(services, empId, punchInTime, punchOutTime);

  const prettyDateStr = prettyDate(date, "EEEE, MMMM d, yyyy", { fallback: date });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border bg-card/50">
        <Button variant="outline" intensity="ghost" size="icon" asChild>
          <Link href={backHref} aria-label="Back">
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-foreground">{employee?.name ?? empId}</span>
          <span className="text-muted-foreground">{prettyDateStr}</span>
          {dayMinutes > 0 && (
            <span className="text-muted-foreground">
              <span className="font-mono text-foreground">{minutesToHoursMinutes(dayMinutes)}</span> clocked
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-1">
        {timeline.length === 0 && unscheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data for this day.</p>
        ) : (
          <>
            {timeline.map((item, i) => {
              if (item.kind === "punch-in" || item.kind === "punch-out") {
                return <PunchMarker key={i} item={item} />;
              }
              if (item.kind === "gap") {
                return <GapMarker key={i} item={item} />;
              }
              const serviceItem = item as ServiceItem;
              return <ServiceCard key={serviceItem.service.servId} item={serviceItem} />;
            })}

            {unscheduled.length > 0 && (
              <div className="pt-4">
                <p className="text-xs text-muted-foreground mb-2 px-1">
                  No time data ({unscheduled.length} stop{unscheduled.length !== 1 ? "s" : ""})
                </p>
                <div className="space-y-1">
                  {unscheduled.map((service) => (
                    <UnscheduledService key={service.servId} service={service} empId={empId} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
