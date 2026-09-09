"use client";

import { useSelector } from "react-redux";
import { X } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import {
  customerIncreaseSortLabels,
  CustomerIncreaseSortKey,
} from "@/app/priceIncrease/results/customerIncreaseSortFns";
import {
  customerIncreaseGroupLabels,
  CustomerIncreaseGroupKey,
} from "@/app/priceIncrease/results/customerIncreaseGroupFns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";

const ALL_SORT_KEYS = Object.keys(customerIncreaseSortLabels) as CustomerIncreaseSortKey[];
const ALL_GROUP_KEYS = Object.keys(customerIncreaseGroupLabels) as CustomerIncreaseGroupKey[];

/**
 * Sort and group controls for the price increase results views.
 * Reads from and dispatches to priceIncreaseConfigSlice.viewConfig.
 */
export function IncreaseViewControls() {
  const dispatch = useAppDispatch();
  const viewConfig = useSelector(priceIncreaseConfigSelect.viewConfig);
  const { sortKeys, groupKey } = viewConfig;

  function handleToggleSortKey(key: CustomerIncreaseSortKey) {
    if (sortKeys.includes(key)) {
      dispatch(priceIncreaseConfigActions.removeViewSortKey(key));
    } else {
      dispatch(priceIncreaseConfigActions.addViewSortKey(key));
    }
  }

  function handleSetGroupKey(key: CustomerIncreaseGroupKey | null) {
    dispatch(priceIncreaseConfigActions.setViewGroupKey(key));
  }

  return (
    <div className="flex items-center gap-2">
      {/* Sort picker */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 px-2 py-1 rounded border border-border text-xs text-foreground/70 hover:bg-accent/10 transition-colors">
            <span className="text-foreground/40">Sort</span>
            {sortKeys.length === 0 ? (
              <span className="text-foreground/40">None</span>
            ) : (
              <div className="flex items-center gap-1">
                {sortKeys.map((key) => (
                  <span
                    key={key}
                    className="flex items-center gap-0.5 px-1.5 py-0 rounded bg-primary/20 text-primary text-xs"
                  >
                    {customerIncreaseSortLabels[key]}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(priceIncreaseConfigActions.removeViewSortKey(key));
                      }}
                      className="hover:text-destructive"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <span className="text-foreground/30">▾</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-2">
          <p className="text-xs text-foreground/40 mb-1.5 px-1">Sort by (priority order)</p>
          <div className="space-y-0.5">
            {ALL_SORT_KEYS.map((key) => {
              const isActive = sortKeys.includes(key);
              const priority = sortKeys.indexOf(key);
              return (
                <button
                  key={key}
                  onClick={() => handleToggleSortKey(key)}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "text-foreground/70 hover:bg-accent/10"
                  }`}
                >
                  <span>{customerIncreaseSortLabels[key]}</span>
                  {isActive && (
                    <span className="text-primary/60 font-mono">#{priority + 1}</span>
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Group picker */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 px-2 py-1 rounded border border-border text-xs text-foreground/70 hover:bg-accent/10 transition-colors">
            <span className="text-foreground/40">Group</span>
            {groupKey ? (
              <span className="flex items-center gap-0.5 px-1.5 py-0 rounded bg-accent/20 text-foreground/70 text-xs">
                {customerIncreaseGroupLabels[groupKey]}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetGroupKey(null);
                  }}
                  className="hover:text-destructive"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ) : (
              <span className="text-foreground/40">None</span>
            )}
            <span className="text-foreground/30">▾</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-2">
          <p className="text-xs text-foreground/40 mb-1.5 px-1">Group by</p>
          <div className="space-y-0.5">
            <button
              onClick={() => handleSetGroupKey(null)}
              className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                !groupKey ? "bg-accent/20 text-foreground/70" : "text-foreground/50 hover:bg-accent/10"
              }`}
            >
              None
            </button>
            {ALL_GROUP_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => handleSetGroupKey(key)}
                className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                  groupKey === key
                    ? "bg-accent/20 text-foreground/70"
                    : "text-foreground/70 hover:bg-accent/10"
                }`}
              >
                {customerIncreaseGroupLabels[key]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
