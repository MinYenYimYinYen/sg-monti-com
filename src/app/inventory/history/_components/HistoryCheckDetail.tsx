"use client";

import { InventoryCheck } from "@/app/inventory/InventoryTypes";

type DisplayMode = "decimal" | "subUnits";

type HistoryCheckDetailProps = {
  check: InventoryCheck;
  displayMode: DisplayMode;
};

export function HistoryCheckDetail({ check, displayMode }: HistoryCheckDetailProps) {
  // Group entries by category, sort categories and products alphabetically
  const byCategory = new Map<string, InventoryCheck["entries"]>();
  for (const entry of check.entries) {
    const cat = entry.product.category || "Uncategorized";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(entry);
  }
  byCategory.forEach((entries) =>
    entries.sort((a, b) => a.product.description.localeCompare(b.product.description)),
  );
  const sortedCategories = Array.from(byCategory.keys()).sort();

  if (check.entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-sm text-muted-foreground">No entries recorded for this check.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Check header */}
      <div className="px-4 py-3 border-b border-border bg-card shrink-0">
        <p className="text-base font-semibold">{check.checkDate}</p>
        <p className="text-xs text-muted-foreground">
          {check.entries.length} product{check.entries.length !== 1 ? "s" : ""} · by {check.createdBy}
        </p>
      </div>

      {/* Category sections */}
      {sortedCategories.map((category) => {
        const entries = byCategory.get(category)!;
        return (
          <div key={category}>
            {/* Category header */}
            <div className="px-4 py-2 bg-accent/10 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </p>
            </div>

            {/* Product rows */}
            {entries.map((entry) => {
              const display = entry.product.unitConfigDisplay.format({
                amount: entry.totalCount,
                targetContexts: displayMode === "decimal" ? ["load"] : ["load", "app"],
              });

              return (
                <div
                  key={entry.productId}
                  className="flex items-center justify-between px-4 py-3 border-b border-border"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">
                      {entry.product.description}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.counts.length} count{entry.counts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-accent shrink-0 ml-4">
                    {display.formattedString}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
