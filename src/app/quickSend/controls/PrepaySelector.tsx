"use client";

import { useSelector } from "react-redux";
import { prepaySelect } from "@/app/realGreen/prepay/selectors/prepaySelect";

type Props = {
  value: string | null;
  onChange: (prepayId: string | null) => void;
  label?: string;
};

/**
 * Shared prepay dropdown for QuickSend2 controls.
 * Reads prepayDocs from the store internally.
 * Calls onChange with null when "None" is selected.
 */
export function PrepaySelector({ value, onChange, label = "Prepay" }: Props) {
  const prepayDocs = useSelector(prepaySelect.prepayDocs);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    onChange(raw === "" ? null : raw);
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select
        value={value ?? ""}
        onChange={handleChange}
        className="text-xs rounded border border-border bg-card text-foreground px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">None</option>
        {prepayDocs.map((prepay) => (
          <option key={prepay.prepayId} value={prepay.prepayId}>
            {prepay.prepayId} — {prepay.percent}%
          </option>
        ))}
      </select>
    </div>
  );
}
