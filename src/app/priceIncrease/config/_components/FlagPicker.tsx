"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";

export function FlagPicker() {
  const dispatch = useAppDispatch();
  const availableFlags = useSelector(priceIncreaseConfigSelect.availableFlags);
  const hydratedMappings = useSelector(priceIncreaseConfigSelect.flagMappingsDraftHydrated);
  const selectedId = useSelector(priceIncreaseConfigSelect.flagPickerSelectedId);

  const handleAdd = () => {
    if (selectedId !== null) {
      dispatch(priceIncreaseConfigActions.addFlagMapping(selectedId));
    }
  };

  const handleRemove = (flagId: number) => {
    dispatch(priceIncreaseConfigActions.removeFlagMapping(flagId));
  };

  const handlePercentChange = (flagId: number, value: string) => {
    // Integer only — 1 represents 1%
    const parsed = parseInt(value.replace(/\D/g, ""), 10);
    dispatch(
      priceIncreaseConfigActions.updateFlagMappingPercent({
        flagId,
        increasePercent: isNaN(parsed) ? 0 : parsed,
      }),
    );
  };

  return (
    <div className="flex gap-3 items-stretch">
      {/* Left box — available flags */}
      <div className="flex-1 flex flex-col">
        <div className="text-xs font-medium text-muted-foreground mb-1.5">Available Flags</div>
        <div className="border border-border rounded-md bg-card overflow-y-auto h-48">
          {availableFlags.length === 0 && (
            <p className="text-xs text-muted-foreground p-3">All flags are mapped.</p>
          )}
          {availableFlags.map((flag) => (
            <button
              key={flag.flagId}
              onClick={() =>
                dispatch(
                  priceIncreaseConfigActions.setFlagPickerSelected(
                    selectedId === flag.flagId ? null : flag.flagId,
                  ),
                )
              }
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                selectedId === flag.flagId
                  ? "bg-primary/15 text-primary"
                  : "text-foreground hover:bg-muted/40"
              }`}
            >
              {flag.desc}
            </button>
          ))}
        </div>
      </div>

      {/* Center controls */}
      <div className="flex flex-col items-center justify-center gap-2 pt-5">
        <Button
          size="icon"
          variant="outline"
          intensity="ghost"
          onClick={handleAdd}
          disabled={selectedId === null}
          title="Add selected flag"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          intensity="ghost"
          onClick={() => {
            // Remove all — clear the draft
            hydratedMappings.forEach((m) =>
              dispatch(priceIncreaseConfigActions.removeFlagMapping(m.flagId)),
            );
          }}
          disabled={hydratedMappings.length === 0}
          title="Remove all"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Right box — selected flags with percent inputs */}
      <div className="flex-1 flex flex-col">
        <div className="text-xs font-medium text-muted-foreground mb-1.5">Selected Flags</div>
        <div className="border border-border rounded-md bg-card overflow-y-auto h-48">
          {hydratedMappings.length === 0 && (
            <p className="text-xs text-muted-foreground p-3">No flags selected.</p>
          )}
          {hydratedMappings.map((mapping) => (
            <div
              key={mapping.flagId}
              className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 last:border-0"
            >
              <span className="flex-1 text-xs text-foreground truncate">{mapping.desc}</span>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={mapping.increasePercent === 0 ? "" : mapping.increasePercent.toString()}
                onChange={(e) => handlePercentChange(mapping.flagId, e.target.value)}
                placeholder="0"
                className="w-14 h-7 text-xs text-center px-1"
              />
              <span className="text-xs text-muted-foreground">%</span>
              <button
                onClick={() => handleRemove(mapping.flagId)}
                className="text-muted-foreground hover:text-destructive transition-colors text-xs ml-1"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
