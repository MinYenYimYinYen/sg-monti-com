"use client";

import React, { useState } from "react";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { ScrollArea } from "@/style/components/scroll-area";
import { Input } from "@/style/components/input";
import { Badge } from "@/style/components/badge";
import { Search } from "lucide-react";
import { cn } from "@/style/utils";

type ProgCodeListPanelProps = {
  progCodes: ProgCode[];
  selectedProgCodeId: string | null;
  onSelectAction: (progCodeId: string) => void;
};

export function ProgCodeListPanel({
  progCodes,
  selectedProgCodeId,
  onSelectAction,
}: ProgCodeListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = progCodes
    .filter((pc) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        pc.progCodeId.toLowerCase().includes(q) ||
        pc.description.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.progCodeId.localeCompare(b.progCodeId));

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
              No program codes found
            </p>
          ) : (
            filtered.map((pc) => (
              <button
                key={pc.progCodeId}
                onClick={() => onSelectAction(pc.progCodeId)}
                className={cn(
                  "w-full text-left px-2.5 py-2 rounded-md transition-colors border",
                  selectedProgCodeId === pc.progCodeId
                    ? "bg-primary/15 border-primary/30"
                    : "hover:bg-accent/10 border-transparent",
                )}
              >
                {/* Line 1: id · description */}
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="font-mono shrink-0 text-muted-foreground">
                    {pc.progCodeId}
                  </span>
                  <span className="truncate text-foreground">
                    {pc.description}
                  </span>
                </div>
                {/* Line 2: price table badges + service code count */}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge
                    variant="secondary"
                    intensity="soft"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4 font-normal",
                      pc.priceTable
                        ? "bg-accent/30"
                        : "bg-muted/30 text-muted-foreground",
                    )}
                  >
                    {pc.priceTable ? pc.priceTable.desc : "No price table"}
                  </Badge>
                  {pc.econPriceTable && (
                    <Badge
                      variant="primary"
                      intensity="soft"
                      className="text-[10px] px-1.5 py-0 h-4 font-normal"
                    >
                      Econ: {pc.econPriceTable.desc}
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    intensity="ghost"
                    className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground"
                  >
                    servCodes: {pc.servCodes.length}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
