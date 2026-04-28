"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { qsSelect } from "../quickSendSelect";
import { quickSendActions } from "../quickSendSlice";
import { ServCodeCheckboxList } from "./ServCodeCheckboxList";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ProgramConfig } from "../QuickSendTypes";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";

type Props = {
  config: ProgramConfig;
  progCode: ProgCode;
  /** True when this program is directly referenced by name in the template HTML. */
  isPinned: boolean;
};

/**
 * A single row in the ProgramPanel for one configured program.
 *
 * Collapsed: shows progCodeId + description + remove button (disabled if pinned).
 * Expanded: shows servCode checkboxes + price override.
 *
 * All mutations go through runtime overrides so they don't dirty the persisted
 * template until the user explicitly saves.
 */
export function ProgramRow({ config, progCode, isPinned }: Props) {
  const dispatch = useAppDispatch();
  const programVariableMap = useSelector(qsSelect.programVariableMap);
  const [isExpanded, setIsExpanded] = useState(false);

  const vars = programVariableMap.get(config.progCodeId);
  const nonServiceCallCodes = progCode.servCodes.filter((s) => !s.isServiceCall);

  const handleServCodesChange = (servCodeIds: string[]) => {
    dispatch(quickSendActions.setIncludedServCodeIds({ progCodeId: config.progCodeId, servCodeIds }));
  };

  const handleRemove = () => {
    dispatch(quickSendActions.removeProgramConfig(config.progCodeId));
  };

  return (
    <div className="border-t border-border/50">
      {/* Row header */}
      <div className="flex items-center gap-1 px-3 py-1.5 group">
        <button
          className="flex flex-1 items-center gap-1.5 text-left min-w-0"
          onClick={() => setIsExpanded((v) => !v)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">
              {config.progCodeId}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {progCode.description}
            </span>
          </div>
        </button>

        {/* Pricing summary */}
        {vars && vars.servPrice !== null && (
          <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
            ${vars.servPrice.toFixed(2)}
          </span>
        )}

        {/* Remove button — disabled if pinned (directly referenced in template) */}
        <button
          onClick={handleRemove}
          disabled={isPinned}
          title={isPinned ? "Remove @{progCodeId}.* mentions from the template first" : "Remove program"}
          className="ml-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Expanded config */}
      {isExpanded && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          <ServCodeCheckboxList
            servCodes={nonServiceCallCodes}
            selected={config.includedServCodeIds}
            onChange={handleServCodesChange}
          />
          {/* Per-visit price override */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              Price override:
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Chart price"
              value={config.priceOverride ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  dispatch(quickSendActions.clearPriceOverride(config.progCodeId));
                } else {
                  const parsed = parseFloat(raw);
                  if (!isNaN(parsed) && parsed >= 0) {
                    dispatch(quickSendActions.setPriceOverride({ progCodeId: config.progCodeId, price: parsed }));
                  }
                }
              }}
              className="w-24 rounded border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}
