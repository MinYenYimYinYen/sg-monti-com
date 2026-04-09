"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  LoadoutFeedback,
  EquipmentMixFeedback,
  MasterProductFeedbackEntry,
  ProductFeedbackEntry,
} from "./LoadoutFeedback";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";

// ---------------------------------------------------------------------------
// Shared view type
// ---------------------------------------------------------------------------

type FeedbackView = "percent" | "app" | "load";

// ---------------------------------------------------------------------------
// Schedule Summary
// ---------------------------------------------------------------------------

function ScheduleSummary({ feedback }: { feedback: LoadoutFeedback }) {
  const rate = (feedback.completionRate * 100).toFixed(0);
  return (
    <section className="bg-card rounded-lg p-4">
      <h2 className="text-foreground font-semibold mb-3">Schedule Summary</h2>
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
          <p className="text-foreground text-lg font-bold">{rate}%</p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Equipment Mix
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
  if (entries.length === 0) return null;

  return (
    <section className="bg-card rounded-lg p-4">
      <h2 className="text-foreground font-semibold mb-3">Equipment Mix</h2>
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
    </section>
  );
}

// ---------------------------------------------------------------------------
// Product Usage
// ---------------------------------------------------------------------------

function formatProductAmount(entry: ProductFeedbackEntry, amount: number, view: FeedbackView): string {
  if (view === "percent") {
    if (entry.plannedUsed === 0) return "—";
    return `${((amount / entry.plannedUsed) * 100).toFixed(1)}%`;
  }
  if (view === "load") {
    // Load unit only — no remainder. Use toFixed(1) on the numeric part.
    const result = entry.unitConfigDisplay.format({ amount, targetContexts: ["load"], rounding: "none" });
    if (result.parts.length === 0) return "—";
    const part = result.parts[0];
    return `${part.amount.toFixed(1)}`;
  }
  // App unit — whole numbers, no unit label
  return amount.toFixed(0);
}

function formatProductDelta(entry: ProductFeedbackEntry, value: number, view: FeedbackView, baseline: number): string {
  if (view === "percent") {
    if (baseline === 0) return "—";
    const pct = (value / baseline) * 100;
    return pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
  }
  if (view === "load") {
    const result = entry.unitConfigDisplay.format({ amount: Math.abs(value), targetContexts: ["load"], rounding: "none" });
    if (result.parts.length === 0) return "—";
    const part = result.parts[0];
    const sign = value >= 0 ? "+" : "-";
    return `${sign}${part.amount.toFixed(1)} ${part.unit}`;
  }
  return value >= 0 ? `+${value.toFixed(0)}` : value.toFixed(0);
}

function DeltaCell({
  entry,
  value,
  view,
  baseline,
}: {
  entry: ProductFeedbackEntry;
  value: number;
  view: FeedbackView;
  baseline: number;
}) {
  const display = formatProductDelta(entry, value, view, baseline);

  const colorClass =
    Math.abs(value) < 0.01
      ? "text-foreground/40"
      : value > 0
        ? "text-destructive"
        : "text-accent";

  return <td className={`py-2 text-right tabular-nums ${colorClass}`}>{display}</td>;
}

function SubProductRow({ entry, view }: { entry: ProductFeedbackEntry; view: FeedbackView }) {
  return (
    <tr className="border-b border-foreground/5 bg-accent/5">
      <td className="py-1.5 pl-8 text-foreground/70 text-sm">{entry.description}</td>
      <td className="py-1.5 text-foreground/50 text-center text-sm">{entry.unit.desc}</td>
      <td className="py-1.5 text-foreground/70 text-right tabular-nums text-sm">
        {formatProductAmount(entry, entry.actualUsed, view)}
      </td>
      <td className="py-1.5 text-foreground/70 text-right tabular-nums text-sm">
        {formatProductAmount(entry, entry.crmUsed, view)}
      </td>
      <td className="py-1.5 text-foreground/70 text-right tabular-nums text-sm">
        {formatProductAmount(entry, entry.plannedUsed, view)}
      </td>
      <DeltaCell entry={entry} value={entry.actualVsCrm} view={view} baseline={entry.crmUsed} />
      <DeltaCell entry={entry} value={entry.actualVsPlanned} view={view} baseline={entry.plannedUsed} />
    </tr>
  );
}

function MasterProductRow({
  entry,
  view,
  expanded,
  onToggle,
}: {
  entry: MasterProductFeedbackEntry;
  view: FeedbackView;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasChildren = entry.subProducts.length > 0;

  return (
    <>
      <tr
        className={`border-b border-foreground/5 ${hasChildren ? "cursor-pointer hover:bg-accent/5" : ""}`}
        onClick={hasChildren ? onToggle : undefined}
      >
        <td className="py-2 text-foreground">
          <span className="flex items-center gap-1">
            {hasChildren ? (
              expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
              )
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            {entry.description}
          </span>
        </td>
        <td className="py-2 text-foreground/60 text-center">{entry.unit.desc}</td>
        <td className="py-2 text-foreground text-right tabular-nums">
          {formatProductAmount(entry, entry.actualUsed, view)}
        </td>
        <td className="py-2 text-foreground text-right tabular-nums">
          {formatProductAmount(entry, entry.crmUsed, view)}
        </td>
        <td className="py-2 text-foreground text-right tabular-nums">
          {formatProductAmount(entry, entry.plannedUsed, view)}
        </td>
        <DeltaCell entry={entry} value={entry.actualVsCrm} view={view} baseline={entry.crmUsed} />
        <DeltaCell entry={entry} value={entry.actualVsPlanned} view={view} baseline={entry.plannedUsed} />
      </tr>
      {expanded &&
        entry.subProducts.map((sub) => (
          <SubProductRow key={sub.productId} entry={sub} view={view} />
        ))}
    </>
  );
}

function ProductFeedbackSection({ feedback, view }: { feedback: LoadoutFeedback; view: FeedbackView }) {
  const entries = [...feedback.productFeedback].sort((a, b) =>
    a.description.localeCompare(b.description),
  );
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  if (entries.length === 0) return null;

  const toggleExpanded = (productId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  return (
    <section className="bg-card rounded-lg p-4">
      <h2 className="text-foreground font-semibold mb-3">Product Usage</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-foreground/60 text-left border-b border-foreground/10">
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 font-medium text-center">Unit</th>
              <th className="pb-2 font-medium text-right">Actual</th>
              <th className="pb-2 font-medium text-right">CRM</th>
              <th className="pb-2 font-medium text-right">Planned</th>
              <th className="pb-2 font-medium text-right">Actual vs CRM</th>
              <th className="pb-2 font-medium text-right">Actual vs Planned</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <MasterProductRow
                key={entry.productId}
                entry={entry}
                view={view}
                expanded={expandedIds.has(entry.productId)}
                onToggle={() => toggleExpanded(entry.productId)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main display component
// ---------------------------------------------------------------------------

export function LoadoutFeedbackDisplay({ feedback }: { feedback: LoadoutFeedback }) {
  const [view, setView] = useState<FeedbackView>("app");

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
      <ProductFeedbackSection feedback={feedback} view={view} />
    </div>
  );
}
