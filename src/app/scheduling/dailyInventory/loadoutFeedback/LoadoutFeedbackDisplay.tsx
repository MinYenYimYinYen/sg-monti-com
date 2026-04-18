"use client";

import { useState } from "react";
import {
  LoadoutFeedback,
  EquipmentMixFeedback,
  EquipmentChemicalFeedback,
  OtherSubProductFeedback,
} from "./LoadoutFeedback";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/style/components/tooltip";
import { LandPlot, ChevronRight, ChevronDown } from "lucide-react";
import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// ---------------------------------------------------------------------------
// Shared view type
// ---------------------------------------------------------------------------

type FeedbackView = "percent" | "app" | "load";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatAmount(
  amount: number,
  unitConfigDisplay: UnitConfigDisplay,
  view: FeedbackView,
  percentBaseline?: number,
): string {
  if (view === "percent") {
    if (percentBaseline === undefined || percentBaseline === 0) return "—";
    return `${((amount / percentBaseline) * 100).toFixed(1)}%`;
  }
  if (view === "load") {
    return unitConfigDisplay.format({
      amount,
      targetContexts: ["load", "app"],
      rounding: "none",
    }).formattedString;
  }
  return unitConfigDisplay.format({
    amount,
    targetContexts: ["app"],
    rounding: "none",
  }).formattedString;
}

function formatDelta(
  value: number,
  unitConfigDisplay: UnitConfigDisplay,
  view: FeedbackView,
  baseline: number,
): string {
  if (view === "percent") {
    if (baseline === 0) return "—";
    const pct = (value / baseline) * 100;
    return pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
  }
  if (view === "load") {
    const result = unitConfigDisplay.format({
      amount: Math.abs(value),
      targetContexts: ["load", "app"],
      rounding: "none",
    });
    const sign = value >= 0 ? "+" : "−";
    return `${sign}${result.formattedString}`;
  }
  const result = unitConfigDisplay.format({
    amount: Math.abs(value),
    targetContexts: ["app"],
    rounding: "none",
  });
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${result.formattedString}`;
}

function DeltaCell({
  value,
  unitConfigDisplay,
  view,
  baseline,
}: {
  value: number;
  unitConfigDisplay: UnitConfigDisplay;
  view: FeedbackView;
  baseline: number;
}) {
  const display = formatDelta(value, unitConfigDisplay, view, baseline);
  const colorClass =
    Math.abs(value) < 0.01
      ? "text-foreground/40"
      : value > 0
        ? "text-destructive"
        : "text-accent";
  return (
    <td className={`py-2 text-right tabular-nums ${colorClass}`}>{display}</td>
  );
}

// ---------------------------------------------------------------------------
// Service compliance check
// ---------------------------------------------------------------------------

/**
 * Determines whether a service used the products required by its servCode's productRules.
 *
 * Rule matching: the first rule whose size condition applies to service.size is used.
 *   "all" → always applies
 *   "lte" → applies when service.size <= rule.size
 *   "gt"  → applies when service.size > rule.size
 *
 * Compliance: ALL expected productMaster IDs must appear in usedAppProducts (AND logic).
 */
function getServiceCompliance(service: Service): "pass" | "fail" | "no-rule" {
  const rules = service.servCode.productRules;
  if (rules.length === 0) return "no-rule";

  const applicableRule = rules.find((rule) => {
    if (rule.sizeOperator === "all") return true;
    if (rule.sizeOperator === "lte") return service.size <= rule.size;
    if (rule.sizeOperator === "gt") return service.size > rule.size;
    return false;
  });

  if (!applicableRule) return "no-rule";

  // Collect all sub-product IDs from all masters in the rule.
  // RealGreen logs sub-product IDs in usedAppProducts, not master IDs.
  const expectedSubIds = applicableRule.productMasters.flatMap((pm) =>
    pm.subProductConfigs.map((c) => c.subId),
  );

  if (expectedSubIds.length === 0) return "no-rule";

  const usedProductIds = new Set(
    service.production?.usedAppProducts
      ?.filter((ap) => ap.productCommon.unit.metric !== "area")
      .map((ap) => ap.productId) ?? [],
  );
  const allExpectedUsed = expectedSubIds.every((id) => usedProductIds.has(id));

  return allExpectedUsed ? "pass" : "fail";
}

// ---------------------------------------------------------------------------
// ServiceProductsCell — per-product code tags with treated-area discrepancy tooltip
// ---------------------------------------------------------------------------

function ServiceProductsCell({
  service,
  serviceWarningMap,
}: {
  service: Service;
  serviceWarningMap: Map<number, string[]>;
}) {
  const appProducts = service.production?.usedAppProducts?.filter(
    (ap) => ap.productCommon.unit.metric !== "area",
  );

  if (!appProducts || appProducts.length === 0)
    return <span className="text-foreground/40">—</span>;

  const serviceWarnings = serviceWarningMap.get(service.servId);
  // If the master "area" row has a treated discrepancy, all sub-products for this service are suspect.
  const hasMasterTreatedDiscrepancy = serviceWarnings !== undefined && serviceWarnings.length > 0;

  return (
    <TooltipProvider>
      <span className="flex flex-wrap gap-x-1">
        {appProducts.map((ap, index) => {
          const treatedDiscrepancy =
            hasMasterTreatedDiscrepancy || ap.treated !== service.size;
          const code = ap.productCommon.productCode;

          return (
            <span key={ap.productId}>
              {index > 0 && <span className="text-foreground/40">, </span>}
              {treatedDiscrepancy ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-destructive decoration-dotted underline cursor-help inline p-0 bg-transparent border-0 font-[inherit] text-[inherit]"
                    >
                      {code}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasMasterTreatedDiscrepancy ? (
                      serviceWarnings.map((warning, i) => <p key={i}>{warning}</p>)
                    ) : (
                      <>
                        <p>
                          Tablet recorded:{" "}
                          {ap.treated.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}{" "}
                          ksf
                        </p>
                        <p>
                          Service size:{" "}
                          {service.size.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}{" "}
                          ksf
                        </p>
                      </>
                    )}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span>{code}</span>
              )}
            </span>
          );
        })}
      </span>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Service detail sub-table
// ---------------------------------------------------------------------------

function ServiceDetailTable({
  services,
  colSpan,
  serviceWarningMap,
}: {
  services: Service[];
  colSpan: number;
  serviceWarningMap: Map<number, string[]>;
}) {
  if (services.length === 0) {
    return (
      <tr>
        <td colSpan={colSpan} className="pb-2 pt-0 pl-8">
          <p className="text-foreground/40 text-xs italic">
            No matched services.
          </p>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan} className="pb-2 pt-0 pl-8">
        <table className="w-full text-xs border border-foreground/10 rounded">
          <thead>
            <tr className="text-foreground/50 border-b border-foreground/10">
              <th className="py-1 px-2 text-left font-medium">Customer</th>
              <th className="py-1 px-2 text-left font-medium">Serv Code</th>
              <th className="py-1 px-2 text-right font-medium">Size (ksf)</th>
              <th className="py-1 px-2 text-left font-medium">Products Used</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => {
              const compliance = getServiceCompliance(service);
              const rowBg =
                compliance === "pass"
                  ? "bg-accent/10"
                  : compliance === "fail"
                    ? "bg-destructive/10"
                    : "";

              return (
                <tr
                  key={service.servId}
                  className={`border-b border-foreground/5 last:border-0 ${rowBg}`}
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
                  <td className="py-1 px-2 text-foreground/60">
                    <ServiceProductsCell
                      service={service}
                      serviceWarningMap={serviceWarningMap}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Schedule Summary
// ---------------------------------------------------------------------------

type SummaryTab = "count" | "size";

function ScheduleSummary({ feedback }: { feedback: LoadoutFeedback }) {
  const [tab, setTab] = useState<SummaryTab>("count");

  const countRate = (feedback.completionRate * 100).toFixed(0);
  const sizeRate = (feedback.sizeCompletionRate * 100).toFixed(0);

  return (
    <section className="bg-card rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-foreground font-semibold">Schedule Summary</h2>
        <RadioGroup
          variant="button-group"
          value={tab}
          onValueChange={(v) => setTab(v as SummaryTab)}
        >
          <RadioGroupItem value="count">Count</RadioGroupItem>
          <RadioGroupItem value="size">Size</RadioGroupItem>
        </RadioGroup>
      </div>
      {tab === "count" ? (
        <div className="flex gap-8 text-sm">
          <div>
            <span className="text-foreground/60">Completed</span>
            <p className="text-foreground text-lg font-bold">
              {feedback.completedCount}
            </p>
          </div>
          <div>
            <span className="text-foreground/60">Scheduled</span>
            <p className="text-foreground text-lg font-bold">
              {feedback.scheduleCount}
            </p>
          </div>
          <div>
            <span className="text-foreground/60">Completion Rate</span>
            <p className="text-foreground text-lg font-bold">{countRate}%</p>
          </div>
        </div>
      ) : (
        <div className="flex gap-8 text-sm">
          <div>
            <span className="text-foreground/60">Size Completed</span>
            <p className="text-foreground text-lg font-bold flex items-center gap-1">
              <LandPlot className="size-4" />
              {feedback.completedSize.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-foreground/60">Size Scheduled</span>
            <p className="text-foreground text-lg font-bold flex items-center gap-1">
              <LandPlot className="size-4" />
              {feedback.scheduledSize.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-foreground/60">Size Completion Rate</span>
            <p className="text-foreground text-lg font-bold">{sizeRate}%</p>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Equipment Mix Section
// ---------------------------------------------------------------------------

const EQUIPMENT_MIX_COL_COUNT = 6;

function formatEquipmentAmount(
  entry: EquipmentMixFeedback,
  amount: number,
  view: FeedbackView,
): string {
  if (view === "percent") {
    if (entry.plannedAmount === 0) return "—";
    return `${((amount / entry.plannedAmount) * 100).toFixed(1)}%`;
  }
  if (view === "load") {
    return entry.unitConfigDisplay.format({
      amount,
      targetContexts: ["load", "app"],
    }).formattedString;
  }
  return entry.unitConfigDisplay.format({ amount, targetContexts: ["app"] })
    .formattedString;
}

function EquipmentMixRow({
  entry,
  matchedServices,
  view,
  serviceWarningMap,
}: {
  entry: EquipmentMixFeedback;
  matchedServices: Service[];
  view: FeedbackView;
  serviceWarningMap: Map<number, string[]>;
}) {
  const [expanded, setExpanded] = useState(false);
  const Chevron = expanded ? ChevronDown : ChevronRight;
  // Start/Finish/Actual/Expected show raw app amounts regardless of view mode;
  // only the delta column shows a percentage.
  const amountView = view === "percent" ? "app" : view;

  return (
    <>
      <tr className="border-b border-foreground/5">
        <td className="py-2 text-foreground">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-left hover:text-primary transition-colors"
          >
            <Chevron className="size-3 shrink-0" />
            {entry.equipmentId}
          </button>
        </td>
        <td className="py-2 text-foreground/60 text-right tabular-nums">
          <span className="flex items-center justify-end gap-1">
            <LandPlot className="size-3" />
            {entry.completedKsf.toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })}
          </span>
        </td>
        <td className="py-2 text-foreground/60 text-center">
          {entry.unitConfigDisplay.getUnitLabel("app")}
        </td>
        <td className="py-2 text-foreground text-right tabular-nums">
          {formatEquipmentAmount(entry, entry.startAmount, amountView)}
        </td>
        <td className="py-2 text-foreground text-right tabular-nums">
          {formatEquipmentAmount(entry, entry.finishAmount, amountView)}
        </td>
        <td className="py-2 text-foreground text-right tabular-nums">
          {formatEquipmentAmount(entry, entry.totalMixUsed, amountView)}
        </td>
        <td className="py-2 text-foreground/60 text-right tabular-nums">
          {entry.expectedMixUsed !== null
            ? formatEquipmentAmount(entry, entry.expectedMixUsed, amountView)
            : "—"}
        </td>
        {entry.mixVsExpected !== null ? (
          <DeltaCell
            value={entry.mixVsExpected}
            unitConfigDisplay={entry.unitConfigDisplay}
            view={view}
            baseline={entry.expectedMixUsed ?? 0}
          />
        ) : (
          <td className="py-2 text-foreground/40 text-right">—</td>
        )}
      </tr>
      {expanded && (
        <ServiceDetailTable
          services={matchedServices}
          colSpan={EQUIPMENT_MIX_COL_COUNT}
          serviceWarningMap={serviceWarningMap}
        />
      )}
    </>
  );
}

function EquipmentMixSection({
  feedback,
  view,
  serviceWarningMap,
}: {
  feedback: LoadoutFeedback;
  view: FeedbackView;
  serviceWarningMap: Map<number, string[]>;
}) {
  const entries = feedback.equipmentMixFeedback;
  const actuals = feedback.actuals;
  if (entries.length === 0) return null;

  return (
    <section className="bg-card rounded-lg p-4">
      <h2 className="text-foreground font-semibold mb-3">Equipment Mix</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-foreground/60 text-left border-b border-foreground/10">
              <th className="pb-2 font-medium">Equipment</th>
              <th className="pb-2 font-medium text-right">Size</th>
              <th className="pb-2 font-medium text-center">Unit</th>
              <th className="pb-2 font-medium text-right">Start</th>
              <th className="pb-2 font-medium text-right">Finish</th>
              <th className="pb-2 font-medium text-right">Actual</th>
              <th className="pb-2 font-medium text-right">Expected</th>
              <th className="pb-2 font-medium text-right">
                Actual vs Expected
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              // Match entry index to equipment master index
              const master = actuals.equipmentMasters[index];
              return (
                <EquipmentMixRow
                  key={entry.equipmentId}
                  entry={entry}
                  matchedServices={master?.matchedServices ?? []}
                  view={view}
                  serviceWarningMap={serviceWarningMap}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}


// ---------------------------------------------------------------------------
// Other Products Section (non-equipment masters)
// ---------------------------------------------------------------------------

const OTHER_PRODUCTS_COL_COUNT = 8;

function OtherProductsSection({
  feedback,
  view,
  serviceWarningMap,
}: {
  feedback: LoadoutFeedback;
  view: FeedbackView;
  serviceWarningMap: Map<number, string[]>;
}) {
  const entries = feedback.otherFeedback;
  const actuals = feedback.actuals;
  if (entries.length === 0) return null;

  // Build a map from productId → matchedServices across all other master sub-products
  const matchedServicesMap = new Map<number, Service[]>();
  for (const master of actuals.otherMasters) {
    for (const sub of master.subProducts) {
      const existing = matchedServicesMap.get(sub.productId);
      if (existing) {
        // Merge without duplicates (same service may appear under multiple masters)
        const existingIds = new Set(existing.map((s) => s.servId));
        for (const service of sub.matchedServices) {
          if (!existingIds.has(service.servId)) existing.push(service);
        }
      } else {
        matchedServicesMap.set(sub.productId, [...sub.matchedServices]);
      }
    }
  }

  return (
    <section className="bg-card rounded-lg p-4">
      <h2 className="text-foreground font-semibold mb-3">Other Products</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-foreground/60 text-left border-b border-foreground/10">
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 font-medium text-right">Size</th>
              <th className="pb-2 font-medium text-center">Unit</th>
              <th className="pb-2 font-medium text-right">Start</th>
              <th className="pb-2 font-medium text-right">Finish</th>
              <th className="pb-2 font-medium text-right">Actual</th>
              <th className="pb-2 font-medium text-right">Posted</th>
              <th className="pb-2 font-medium text-right">Actual vs Posted</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <OtherProductRow
                key={entry.productId}
                entry={entry}
                matchedServices={matchedServicesMap.get(entry.productId) ?? []}
                view={view}
                serviceWarningMap={serviceWarningMap}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OtherProductRow({
  entry,
  matchedServices,
  view,
  serviceWarningMap,
}: {
  entry: OtherSubProductFeedback;
  matchedServices: Service[];
  view: FeedbackView;
  serviceWarningMap: Map<number, string[]>;
}) {
  const [expanded, setExpanded] = useState(false);
  const Chevron = expanded ? ChevronDown : ChevronRight;
  // Start/Finish/Actual/Posted show raw app amounts regardless of view mode;
  // only the delta column shows a percentage.
  const amountView = view === "percent" ? "app" : view;

  return (
    <>
      <tr className="border-b border-foreground/5">
        <td className="py-2 text-foreground">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-left hover:text-primary transition-colors"
          >
            <Chevron className="size-3 shrink-0" />
            {entry.description}
          </button>
        </td>
        <td className="py-2 text-foreground/60 text-right tabular-nums">
          <span className="flex items-center justify-end gap-1">
            <LandPlot className="size-3" />
            {entry.completedKsf.toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })}
          </span>
        </td>
        <td className="py-2 text-foreground/60 text-center">
          {entry.unit.desc}
        </td>
        <td className="py-2 text-foreground text-right tabular-nums">
          {formatAmount(entry.startAmount, entry.unitConfigDisplay, amountView)}
        </td>
        <td className="py-2 text-foreground text-right tabular-nums">
          {formatAmount(entry.finishAmount, entry.unitConfigDisplay, amountView)}
        </td>
        <td className="py-2 text-foreground text-right tabular-nums">
          {formatAmount(entry.actualUsed, entry.unitConfigDisplay, amountView)}
        </td>
        <td className="py-2 text-foreground text-right tabular-nums">
          {formatAmount(entry.postedAmount, entry.unitConfigDisplay, amountView)}
        </td>
        <DeltaCell
          value={entry.actualVsPosted}
          unitConfigDisplay={entry.unitConfigDisplay}
          view={view}
          baseline={entry.postedAmount}
        />
      </tr>
      {expanded && (
        <ServiceDetailTable
          services={matchedServices}
          colSpan={OTHER_PRODUCTS_COL_COUNT}
          serviceWarningMap={serviceWarningMap}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main display component
// ---------------------------------------------------------------------------

export function LoadoutFeedbackDisplay({
  feedback,
}: {
  feedback: any // LoadoutFeedback;
}) {
  const [view, setView] = useState<FeedbackView>("percent");
  const serviceWarningMap = feedback.serviceWarningMap;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <RadioGroup
          variant="button-group"
          value={view}
          onValueChange={(v) => setView(v as FeedbackView)}
        >
          <RadioGroupItem value="percent">%</RadioGroupItem>
          <RadioGroupItem value="app">App</RadioGroupItem>
          <RadioGroupItem value="load">Load</RadioGroupItem>
        </RadioGroup>
      </div>
      <ScheduleSummary feedback={feedback} />
      <EquipmentMixSection feedback={feedback} view={view} serviceWarningMap={serviceWarningMap} />
      <OtherProductsSection feedback={feedback} view={view} serviceWarningMap={serviceWarningMap} />
    </div>
  );
}
