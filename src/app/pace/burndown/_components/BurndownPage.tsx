"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { burndownSelect } from "@/app/pace/burndownSelect";
import { SeriesDetail } from "@/app/pace/burndown/_components/SeriesDetail";

export function BurndownPage() {
  const burndownSeries = useSelector(burndownSelect.burndownSeries);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedSeries = selectedId
    ? burndownSeries.find((s) => s.id === selectedId) ?? null
    : null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — series selector */}
      <div className="w-56 shrink-0 border-r flex flex-col bg-card">
        <div className="px-3 py-2 border-b">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Groups / Sequences
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {burndownSeries.length === 0 && (
            <p className="px-3 py-4 text-[10px] text-muted-foreground text-center">
              No data yet. Set goals and configure a season plan.
            </p>
          )}
          {burndownSeries.map((series) => (
            <button
              key={series.id}
              onClick={() => setSelectedId(series.id)}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5 ${
                selectedId === series.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-accent/10"
              }`}
            >
              <span className="flex-1 truncate">{series.label}</span>
              {series.kind === "sequence" && (
                <span className="text-[9px] text-secondary bg-secondary/10 rounded px-1 shrink-0">
                  seq
                </span>
              )}
              <span className="text-[10px] text-muted-foreground shrink-0">
                {series.poolHistory.length}
              </span>
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t text-[10px] text-muted-foreground">
          {burndownSeries.filter((s) => s.kind === "group").length} groups ·{" "}
          {burndownSeries.filter((s) => s.kind === "sequence").length} sequences
        </div>
      </div>

      {/* Right panel */}
      {selectedSeries ? (
        <SeriesDetail series={selectedSeries} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Select a group or sequence to view its burndown data.
          </p>
        </div>
      )}
    </div>
  );
}
