"use client";

import React, { useState } from "react";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ScrollArea } from "@/style/components/scroll-area";
import { Input } from "@/style/components/input";
import { Badge } from "@/style/components/badge";
import { Search } from "lucide-react";
import { cn } from "@/style/utils";

type ServCodeListPanelProps = {
  servCodes: ServCode[];
  selectedServCodeId: string | null;
  onSelect: (servCodeId: string) => void;
};

export function ServCodeListPanel({
  servCodes,
  selectedServCodeId,
  onSelect,
}: ServCodeListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = servCodes
    .filter((sc) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        sc.servCodeId.toLowerCase().includes(q) ||
        sc.longName.toLowerCase().includes(q) ||
        sc.progCodeId.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.servCodeId.localeCompare(b.servCodeId));

  return (
    <div className="w-72 shrink-0 flex flex-col gap-2 h-full">
      {/* Search */}
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {/* List */}
      <ScrollArea
        className="rounded-md border bg-popover"
        style={{ height: "calc(100% - 44px)" }}
      >
        <div className="p-1 space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No service codes found
            </p>
          ) : (
            filtered.map((sc) => (
              <button
                key={`${sc.servCodeId}-${sc.progCodeId}`}
                onClick={() => onSelect(sc.servCodeId)}
                className={cn(
                  "w-full text-left px-2.5 py-2 rounded-md transition-colors border",
                  selectedServCodeId === sc.servCodeId
                    ? "bg-primary/15 border-primary/30"
                    : "hover:bg-accent/10 border-transparent",
                )}
              >
                {/* Line 1: id · program · name */}
                <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                  <span className="font-mono shrink-0">{sc.servCodeId}</span>
                  <span className="font-mono text-muted-foreground/60 shrink-0">
                    {sc.progCodeId}
                  </span>
                  <span className="truncate text-foreground">{sc.longName}</span>
                </div>
                {/* Line 2: compact badges */}
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge
                    variant="secondary"
                    intensity="soft"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4 font-normal",
                      !sc.dateRange.min && !sc.dateRange.max
                        ? "bg-muted/30 text-muted-foreground"
                        : "bg-secondary/30",
                    )}
                  >
                    {sc.dateRange.min || sc.dateRange.max
                      ? `${sc.dateRange.min || "?"} – ${sc.dateRange.max || "?"}`
                      : "No dates"}
                  </Badge>
                  <Badge
                    variant="secondary"
                    intensity="soft"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4 font-normal",
                      sc.productRuleDocs.length === 0
                        ? "bg-muted/30 text-muted-foreground"
                        : "bg-secondary/30",
                    )}
                  >
                    Rules: {sc.productRuleDocs.length}
                  </Badge>
                  {sc.alwaysAsap && (
                    <Badge
                      variant="destructive"
                      intensity="soft"
                      className="text-[10px] px-1.5 py-0 h-4 font-normal"
                    >
                      ASAP
                    </Badge>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
