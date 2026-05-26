"use client";

import { useSelector } from "react-redux";
import { loadoutReportSelect } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/loadoutReportSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { LoadoutReportEntry } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/LoadoutReportTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/style/components/accordion";
import {
  summarizeEntries,
  EntrySummary,
} from "@/app/scheduling/dailyInventory/loadoutFeedback/report/reportHelpers";
import { EquipmentBreakdownPopover } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/devComponents/EquipmentBreakdownPopover";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function pctString(value: number | null): string {
  if (value === null) return "—";
  const pct = value * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function pctColor(value: number | null): string {
  if (value === null) return "text-foreground/40";
  const abs = Math.abs(value * 100);
  if (abs < 5) return "text-foreground/40";
  return value > 0 ? "text-destructive" : "text-accent";
}

// ---------------------------------------------------------------------------
// SummaryGrid — vertical stacked layout for trigger content
// ---------------------------------------------------------------------------

function SummaryRow({
  label,
  pct,
  detail,
}: {
  label: string;
  pct: number | null;
  detail?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-4 text-xs">
      <span className="text-foreground/60 truncate">{label}</span>
      <span className={`tabular-nums font-medium text-right ${pctColor(pct)}`}>
        {pctString(pct)}
        {detail && (
          <span className="text-foreground/40 font-normal ml-1">{detail}</span>
        )}
      </span>
    </div>
  );
}

function SummaryGrid({ summary, serviceCount }: { summary: EntrySummary; serviceCount: number }) {
  const compliancePct =
    summary.complianceRate !== null
      ? `${Math.round(summary.complianceRate * 100)}%`
      : null;
  const complianceColor =
    summary.complianceRate === null
      ? "text-foreground/40"
      : summary.complianceRate >= 0.9
        ? "text-accent"
        : summary.complianceRate >= 0.7
          ? "text-secondary"
          : "text-destructive";

  const hasEquipment = summary.equipmentSummaries.length > 0;
  const hasProducts = summary.productSummaries.length > 0;

  return (
    <div className="flex flex-col gap-1 text-xs mt-1 w-full max-w-sm">
      {/* Service count + compliance */}
      <div className="flex items-center gap-3">
        <span className="text-foreground/50">{serviceCount} services</span>
        {compliancePct !== null && (
          <span className={`font-medium ${complianceColor}`}>
            Planned Products: {compliancePct}
          </span>
        )}
      </div>

      {/* Equipment section */}
      {hasEquipment && (
        <div className="flex flex-col gap-0.5">
          <span className="text-foreground/40 uppercase tracking-wide text-[10px] font-medium">
            Equipment
          </span>
          {summary.equipmentSummaries.map((eq) => {
            const actual = eq.totalMixUsed.toLocaleString(undefined, { maximumFractionDigits: 1 });
            const expected = eq.expectedMixUsed.toLocaleString(undefined, { maximumFractionDigits: 1 });
            return (
              <div key={eq.equipmentId} className="grid grid-cols-[1fr_auto] gap-x-4 text-xs">
                <EquipmentBreakdownPopover eq={eq}>
                  <span className="text-foreground/60 truncate">{eq.equipmentId}</span>
                </EquipmentBreakdownPopover>
                <span className={`tabular-nums font-medium text-right ${pctColor(eq.mixVsExpectedPct)}`}>
                  {pctString(eq.mixVsExpectedPct)}
                  <span className="text-foreground/40 font-normal ml-1">
                    ({actual} / {expected} {eq.unitLabel})
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Products section */}
      {hasProducts && (
        <div className="flex flex-col gap-0.5">
          <span className="text-foreground/40 uppercase tracking-wide text-[10px] font-medium">
            Products
          </span>
          {summary.productSummaries.map((prod) => (
            <SummaryRow
              key={prod.productId}
              label={prod.description}
              pct={prod.actualVsPostedPct}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Service rows table
// ---------------------------------------------------------------------------

function ServiceRows({ services }: { services: Service[] }) {
  if (services.length === 0) {
    return (
      <p className="text-foreground/40 text-xs italic px-2 py-1">
        No completed services.
      </p>
    );
  }

  return (
    <table className="w-full text-xs border border-foreground/10 rounded mt-1">
      <thead>
        <tr className="text-foreground/50 border-b border-foreground/10 text-left">
          <th className="py-1 px-2 font-medium">Customer</th>
          <th className="py-1 px-2 font-medium">Serv Code</th>
          <th className="py-1 px-2 font-medium text-right">Size (ksf)</th>
          <th className="py-1 px-2 font-medium">Products Used</th>
          <th className="py-1 px-2 font-medium text-center">Compliance</th>
        </tr>
      </thead>
      <tbody>
        {services.map((service) => {
          const compliance = service.x.productRuleCompliance;
          const complianceColor =
            compliance === "pass"
              ? "text-accent"
              : compliance === "fail"
                ? "text-destructive"
                : "text-foreground/40";
          const productCodes =
            service.production?.usedAppProducts
              ?.filter((ap) => ap.productCommon.unit.metric !== "area")
              .map((ap) => ap.productCommon.productCode)
              .join(", ") ?? "—";

          return (
            <tr
              key={service.servId}
              className="border-b border-foreground/5 last:border-0"
            >
              <td className="py-1 px-2 text-foreground/80">
                {service.x.customer.displayName}
              </td>
              <td className="py-1 px-2 text-foreground/60">
                {service.servCodeId}
              </td>
              <td className="py-1 px-2 text-right tabular-nums text-foreground/60">
                {service.size.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}
              </td>
              <td className="py-1 px-2 text-foreground/60">{productCodes}</td>
              <td
                className={`py-1 px-2 text-center font-medium ${complianceColor}`}
              >
                {compliance}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// RouteDate accordion item
// ---------------------------------------------------------------------------

function RouteDateItem({ entry }: { entry: LoadoutReportEntry }) {
  const summary = summarizeEntries([entry]);

  return (
    <AccordionItem value={entry.routeDate}>
      <AccordionTrigger className="py-2 items-start">
        <div className="flex flex-col gap-0.5 text-left">
          <span className="text-foreground font-medium">
            {prettyDate(entry.routeDate, "eee, MMM dd")}
          </span>
          <SummaryGrid summary={summary} serviceCount={entry.completedServices.length} />
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-2 pb-2">
          <ServiceRows services={entry.completedServices} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ---------------------------------------------------------------------------
// Employee accordion item
// ---------------------------------------------------------------------------

function EmployeeItem({
  employeeId,
  name,
  entries,
}: {
  employeeId: string;
  name: string;
  entries: LoadoutReportEntry[];
}) {
  const summary = summarizeEntries(entries);
  const totalServices = entries.reduce(
    (sum, entry) => sum + entry.completedServices.length,
    0,
  );

  return (
    <AccordionItem value={employeeId}>
      <AccordionTrigger className="py-2 items-start">
        <div className="flex flex-col gap-0.5 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{name}</span>
            <span className="text-xs text-foreground/50">
              {entries.length} loadout{entries.length !== 1 ? "s" : ""}
            </span>
          </div>
          <SummaryGrid summary={summary} serviceCount={totalServices} />
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-4">
          <Accordion type="single" collapsible className="w-full">
            {entries.map((entry) => (
              <RouteDateItem key={entry.routeDate} entry={entry} />
            ))}
          </Accordion>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function ByEmployeePanel() {
  const employeeIds = useSelector(loadoutReportSelect.employeeIds);
  const entriesByEmployee = useSelector(loadoutReportSelect.entriesByEmployee);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  if (employeeIds.length === 0) {
    return (
      <p className="text-sm text-foreground/40 italic">
        No finished loadouts found for this date range.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold text-foreground text-sm">By Employee</h3>
      <Accordion type="single" collapsible className="w-full">
        {employeeIds.map((employeeId) => {
          const entries = entriesByEmployee.get(employeeId) ?? [];
          const name = employeeMap.get(employeeId)?.name ?? employeeId;
          return (
            <EmployeeItem
              key={employeeId}
              employeeId={employeeId}
              name={name}
              entries={entries}
            />
          );
        })}
      </Accordion>
    </div>
  );
}
