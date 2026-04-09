import { LoadoutFeedback, ProductFeedbackEntry } from "./LoadoutFeedback";

// ---------------------------------------------------------------------------
// Sub-components
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

function EquipmentMixSection({ feedback }: { feedback: LoadoutFeedback }) {
  const entries = feedback.equipmentMixFeedback;
  if (entries.length === 0) return null;

  return (
    <section className="bg-card rounded-lg p-4">
      <h2 className="text-foreground font-semibold mb-3">Equipment Mix Used</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-foreground/60 text-left border-b border-foreground/10">
            <th className="pb-2 font-medium">Equipment</th>
            <th className="pb-2 font-medium text-right">Mix Used (gal)</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.equipmentId} className="border-b border-foreground/5">
              <td className="py-2 text-foreground">{entry.equipmentId}</td>
              <td className="py-2 text-foreground text-right">
                {entry.totalMixUsed.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function DeltaCell({ value }: { value: number }) {
  const formatted = value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  const colorClass =
    Math.abs(value) < 0.01
      ? "text-foreground/40"
      : value > 0
        ? "text-destructive"
        : "text-accent";

  return <td className={`py-2 text-right tabular-nums ${colorClass}`}>{formatted}</td>;
}

function ProductFeedbackRow({ entry }: { entry: ProductFeedbackEntry }) {
  return (
    <tr className="border-b border-foreground/5">
      <td className="py-2 text-foreground">{entry.description}</td>
      <td className="py-2 text-foreground/60 text-center">{entry.unit.desc}</td>
      <td className="py-2 text-foreground text-right tabular-nums">
        {entry.actualUsed.toFixed(2)}
      </td>
      <td className="py-2 text-foreground text-right tabular-nums">
        {entry.crmUsed.toFixed(2)}
      </td>
      <td className="py-2 text-foreground text-right tabular-nums">
        {entry.plannedUsed.toFixed(2)}
      </td>
      <DeltaCell value={entry.actualVsCrm} />
      <DeltaCell value={entry.actualVsPlanned} />
    </tr>
  );
}

function ProductFeedbackSection({ feedback }: { feedback: LoadoutFeedback }) {
  const entries = [...feedback.productFeedback].sort((a, b) =>
    a.description.localeCompare(b.description),
  );

  if (entries.length === 0) return null;

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
              <ProductFeedbackRow key={entry.productId} entry={entry} />
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
  return (
    <div className="flex flex-col gap-4">
      <ScheduleSummary feedback={feedback} />
      <EquipmentMixSection feedback={feedback} />
      <ProductFeedbackSection feedback={feedback} />
    </div>
  );
}
