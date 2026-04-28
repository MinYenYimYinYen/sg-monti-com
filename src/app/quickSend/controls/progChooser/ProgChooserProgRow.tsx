"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { ServCodeCheckboxList } from "@/app/quickSend/controls/ServCodeCheckboxList";
import { progChooserSelect } from "./progChooserSelect";
import { useProgChooser } from "./useProgChooser";

type Props = {
  progCodeId: string;
};

export function ProgChooserProgRow({ progCodeId }: Props) {
  const [open, setOpen] = useState(false);
  const progCodeMap = useSelector(progServSelect.progCodeMap);
  const servCodeOverrides = useSelector(progChooserSelect.servCodeOverrides);
  const priceOverrides = useSelector(progChooserSelect.priceOverrides);
  const { setServCodeOverride, setPriceOverride, clearPriceOverride } = useProgChooser();

  const progCode = progCodeMap.get(progCodeId);
  if (!progCode) return null;

  const nonServiceCallCodes = progCode.servCodes.filter((s) => !s.isServiceCall);
  const selected = servCodeOverrides[progCodeId] ?? [];
  const priceOverride = priceOverrides[progCodeId];

  const handleServCodesChange = (servCodeIds: string[]) => {
    setServCodeOverride({ progCodeId, servCodeIds });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      clearPriceOverride(progCodeId);
    } else {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed >= 0) {
        setPriceOverride({ progCodeId, price: parsed });
      }
    }
  };

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-2 text-xs hover:bg-accent/10"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{progCodeId}</span>
          {progCode.description && (
            <span className="text-muted-foreground truncate">{progCode.description}</span>
          )}
        </div>
        <span className="text-muted-foreground shrink-0">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 px-6 pb-3">
          <ServCodeCheckboxList
            servCodes={nonServiceCallCodes}
            selected={selected}
            onChange={handleServCodesChange}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              Price override:
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Chart price"
              value={priceOverride ?? ""}
              onChange={handlePriceChange}
              className="w-24 rounded border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}
