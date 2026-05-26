"use client";

import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/style/components/popover";
import { EquipmentSummary } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/reportHelpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value: number, decimals = 1): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

// ---------------------------------------------------------------------------
// EquipmentBreakdownPopover
// ---------------------------------------------------------------------------

/**
 * Wraps the equipment row label in a popover trigger.
 * Clicking the label opens a per-date breakdown table showing:
 *   - Start / Finish / Actual Used
 *   - Completed ksf
 *   - Expected Used (from coverage rate × ksf)
 *   - App Method ID and coverage rate
 *   - Matched services for that date
 */
export function EquipmentBreakdownPopover({
  eq,
  children,
}: {
  eq: EquipmentSummary;
  children: React.ReactNode;
}) {
  const breakdown = eq.perDateBreakdown;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-left underline decoration-dotted cursor-pointer hover:text-primary transition-colors"
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[640px] max-h-[480px] overflow-y-auto p-3"
        align="start"
        side="right"
      >
        <div className="flex flex-col gap-3">
          <h4 className="font-semibold text-foreground text-sm">
            {eq.equipmentId} — Per-Date Breakdown
          </h4>

          {breakdown.map((row) => {
            const coverageRateStr =
              row.coverageRate > 0
                ? `${fmt(row.coverageRate, 3)} ${row.unitLabel}/ksf`
                : "—";

            return (
              <div
                key={row.routeDate}
                className="border border-foreground/10 rounded p-2 flex flex-col gap-1.5"
              >
                {/* Date + app method header */}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground text-xs">
                    {prettyDate(row.routeDate, "eee, MMM dd")}
                  </span>
                  <span className="text-foreground/40 text-[10px]">
                    {row.appMethodName} · {coverageRateStr}
                  </span>
                </div>

                {/* Amounts row */}
                <div className="grid grid-cols-5 gap-x-2 text-xs text-foreground/60">
                  <div>
                    <div className="text-[10px] text-foreground/40 uppercase tracking-wide">Start</div>
                    <div className="tabular-nums">{fmt(row.startAmount)} {row.unitLabel}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-foreground/40 uppercase tracking-wide">Finish</div>
                    <div className="tabular-nums">{fmt(row.finishAmount)} {row.unitLabel}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-foreground/40 uppercase tracking-wide">Actual Used</div>
                    <div className="tabular-nums">{fmt(row.totalMixUsed)} {row.unitLabel}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-foreground/40 uppercase tracking-wide">Completed ksf</div>
                    <div className="tabular-nums">{fmt(row.completedKsf)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-foreground/40 uppercase tracking-wide">Expected</div>
                    <div className="tabular-nums">
                      {row.expectedMixUsed !== null
                        ? `${fmt(row.expectedMixUsed)} ${row.unitLabel}`
                        : "—"}
                    </div>
                  </div>
                </div>

                {/* Matched services */}
                {row.matchedServices.length > 0 && (
                  <table className="w-full text-[10px] border border-foreground/10 rounded mt-0.5">
                    <thead>
                      <tr className="text-foreground/40 border-b border-foreground/10 text-left">
                        <th className="py-0.5 px-1.5 font-medium">Customer</th>
                        <th className="py-0.5 px-1.5 font-medium">Code</th>
                        <th className="py-0.5 px-1.5 font-medium text-right">Size (ksf)</th>
                        <th className="py-0.5 px-1.5 font-medium">Products</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.matchedServices.map((service) => {
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
                            <td className="py-0.5 px-1.5 text-foreground/70">
                              {service.x.customer.displayName}
                            </td>
                            <td className="py-0.5 px-1.5 text-foreground/50">
                              {service.servCodeId}
                            </td>
                            <td className="py-0.5 px-1.5 text-right tabular-nums text-foreground/50">
                              {fmt(service.size)}
                            </td>
                            <td className="py-0.5 px-1.5 text-foreground/50">
                              {productCodes}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {row.matchedServices.length === 0 && (
                  <p className="text-[10px] text-foreground/30 italic">No matched services.</p>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
