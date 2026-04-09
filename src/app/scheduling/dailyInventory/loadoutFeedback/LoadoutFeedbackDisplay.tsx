"use client";

import { useState } from "react";
import {
  LoadoutFeedback,
  EquipmentMixFeedback,
  EquipmentChemicalFeedback,
  GranularSubProductFeedback,
} from "./LoadoutFeedback";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { LandPlot } from "lucide-react";
import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";

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
    return unitConfigDisplay.format({ amount, targetContexts: ["load", "app"], rounding: "none" }).formattedString;
  }
  return unitConfigDisplay.format({ amount, targetContexts: ["app"], rounding: "none" }).formattedString;
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
    const result = unitConfigDisplay.format({ amount: Math.abs(value), targetContexts: ["load", "app"], rounding: "none" });
    const sign = value >= 0 ? "+" : "−";
    return `${sign}${result.formattedString}`;
  }
  const result = unitConfigDisplay.format({ amount: Math.abs(value), targetContexts: ["app"], rounding: "none" });
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
  return <td className={`py-2 text-right tabular-nums ${colorClass}`}>{display}</td>;
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
        <RadioGroup variant="button-group" value={tab} onValueChange={(v) => setTab(v as SummaryTab)}>
          <RadioGroupItem value="count">Count</RadioGroupItem>
          <RadioGroupItem value="size">Size</RadioGroupItem>
        </RadioGroup>
      </div>
      {tab === "count" ? (
        <div className="flex gap-8 text-sm">
          <div>
            <span className="text-foreground/60">Completed</span>
            <p className="text-foreground text-lg font-bold">{feedback.completedCount}</p>
          </div>
          <div>
            <span className="text-foreground/60">Scheduled</span>
            <p className="text-foreground text-lg font-bold">{feedback.scheduleCount}</p>
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
            <p className="text-foreground text-lg font-bold flex items-center gap-1"><LandPlot className="size-4" />{feedback.completedSize.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-foreground/60">Size Scheduled</span>
            <p className="text-foreground text-lg font-bold flex items-center gap-1"><LandPlot className="size-4" />{feedback.scheduledSize.toLocaleString()}</p>
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

function formatEquipmentAmount(entry: EquipmentMixFeedback, amount: number, view: FeedbackView): string {
  if (view === "percent") {
    if (entry.plannedAmount === 0) return "—";
    return `${((amount / entry.plannedAmount) * 100).toFixed(1)}%`;
  }
  if (view === "load") {
    return entry.unitConfigDisplay.format({ amount, targetContexts: ["load", "app"] }).formattedString;
  }
  return entry.unitConfigDisplay.format({ amount, targetContexts: ["app"] }).formattedString;
}

function EquipmentMixSection({ feedback, view }: { feedback: LoadoutFeedback; view: FeedbackView }) {
  const entries = feedback.equipmentMixFeedback;
  const chemicals = feedback.equipmentChemicalFeedback;
  if (entries.length === 0) return null;

  return (
    <section className="bg-card rounded-lg p-4">
      <h2 className="text-foreground font-semibold mb-3">Equipment Mix</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-foreground/60 text-left border-b border-foreground/10">
              <th className="pb-2 font-medium">Equipment</th>
              <th className="pb-2 font-medium text-right">Planned</th>
              <th className="pb-2 font-medium text-right">Start</th>
              <th className="pb-2 font-medium text-right">Finish</th>
              <th className="pb-2 font-medium text-right">Used</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.equipmentId} className="border-b border-foreground/5">
                <td className="py-2 text-foreground">{entry.equipmentId}</td>
                <td className="py-2 text-foreground/60 text-right tabular-nums">
                  {formatEquipmentAmount(entry, entry.plannedAmount, view)}
                </td>
                <td className="py-2 text-foreground text-right tabular-nums">
                  {formatEquipmentAmount(entry, entry.startAmount, view)}
                </td>
                <td className="py-2 text-foreground text-right tabular-nums">
                  {formatEquipmentAmount(entry, entry.finishAmount, view)}
                </td>
                <td className="py-2 text-foreground text-right tabular-nums">
                  {formatEquipmentAmount(entry, entry.totalMixUsed, view)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chemical breakdown */}
      {chemicals.length > 0 && (
        <div className="mt-4">
          <h3 className="text-foreground/70 text-xs font-semibold uppercase tracking-wide mb-2">
            Chemical Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-foreground/60 text-left border-b border-foreground/10">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium text-center">Tank</th>
                  <th className="pb-2 font-medium text-right">Planned</th>
                  <th className="pb-2 font-medium text-right">Actual</th>
                </tr>
              </thead>
              <tbody>
                {chemicals.map((chem, index) => (
                  <ChemicalRow key={`${chem.equipmentId}-${chem.productId}-${index}`} chem={chem} view={view} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function ChemicalRow({ chem, view }: { chem: EquipmentChemicalFeedback; view: FeedbackView }) {
  return (
    <tr className="border-b border-foreground/5">
      <td className="py-2 text-foreground">{chem.description}</td>
      <td className="py-2 text-foreground/60 text-center">{chem.equipmentId}</td>
      <td className="py-2 text-foreground/60 text-right tabular-nums">
        {/* In % mode, planned is the baseline — show as 100% reference */}
        {view === "percent" ? "100%" : formatAmount(chem.plannedAmount, chem.unitConfigDisplay, view)}
      </td>
      <td className="py-2 text-foreground text-right tabular-nums">
        {formatAmount(chem.actualAmount, chem.unitConfigDisplay, view, chem.plannedAmount)}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Other Products Section (non-tank-mixed: granular, standalone liquid, etc.)
// ---------------------------------------------------------------------------

function OtherProductsSection({
  feedback,
  view,
}: {
  feedback: LoadoutFeedback;
  view: FeedbackView;
}) {
  const entries = feedback.granularFeedback;
  if (entries.length === 0) return null;

  return (
    <section className="bg-card rounded-lg p-4">
      <h2 className="text-foreground font-semibold mb-3">Other Products</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-foreground/60 text-left border-b border-foreground/10">
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 font-medium text-center">Unit</th>
              <th className="pb-2 font-medium text-right">Actual</th>
              <th className="pb-2 font-medium text-right">CRM</th>
              <th className="pb-2 font-medium text-right">Actual vs CRM</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <OtherProductRow key={entry.productId} entry={entry} view={view} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OtherProductRow({
  entry,
  view,
}: {
  entry: GranularSubProductFeedback;
  view: FeedbackView;
}) {
  return (
    <tr className="border-b border-foreground/5">
      <td className="py-2 text-foreground">{entry.description}</td>
      <td className="py-2 text-foreground/60 text-center">{entry.unit.desc}</td>
      <td className="py-2 text-foreground text-right tabular-nums">
        {formatAmount(entry.actualUsed, entry.unitConfigDisplay, view, entry.crmUsed)}
      </td>
      <td className="py-2 text-foreground text-right tabular-nums">
        {/* CRM is the reference — show as 100% in percent mode, raw amount otherwise */}
        {view === "percent" ? "100%" : formatAmount(entry.crmUsed, entry.unitConfigDisplay, view)}
      </td>
      <DeltaCell
        value={entry.actualVsCrm}
        unitConfigDisplay={entry.unitConfigDisplay}
        view={view}
        baseline={entry.crmUsed}
      />
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main display component
// ---------------------------------------------------------------------------

export function LoadoutFeedbackDisplay({ feedback }: { feedback: LoadoutFeedback }) {
  const [view, setView] = useState<FeedbackView>("percent");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <RadioGroup variant="button-group" value={view} onValueChange={(v) => setView(v as FeedbackView)}>
          <RadioGroupItem value="percent">%</RadioGroupItem>
          <RadioGroupItem value="app">App</RadioGroupItem>
          <RadioGroupItem value="load">Load</RadioGroupItem>
        </RadioGroup>
      </div>
      <ScheduleSummary feedback={feedback} />
      <EquipmentMixSection feedback={feedback} view={view} />
      <OtherProductsSection feedback={feedback} view={view} />
    </div>
  );
}
