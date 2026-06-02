"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { authSelect } from "@/app/auth/authSlice";
import { inventorySelect } from "@/app/inventory/inventorySelect";
import { useInventoryDeps } from "@/app/inventory/useInventoryDeps";
import { HistoryCheckDetail } from "@/app/inventory/history/_components/HistoryCheckDetail";
import { Button } from "@/style/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/style/components/sheet";
import { ChevronLeft, CalendarDays, ChevronDown } from "lucide-react";

// ---------------------------------------------------------------------------
// Module-level persistence — survives navigation within the same browser session
// ---------------------------------------------------------------------------
let savedDisplayMode: "decimal" | "subUnits" = "decimal";

export default function InventoryHistoryPage() {
  useInventoryDeps();

  const role = useSelector(authSelect.role);
  const router = useRouter();

  // Admin gate
  useEffect(() => {
    if (role && role !== "admin") {
      router.replace("/");
    }
  }, [role, router]);

  const hydratedChecks = useSelector(inventorySelect.hydratedChecks);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState<"decimal" | "subUnits">(
    savedDisplayMode,
  );
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

  // Keep selectedIndex in bounds if checks load after mount
  const safeIndex = Math.min(
    selectedIndex,
    Math.max(0, hydratedChecks.length - 1),
  );
  const selectedCheck = hydratedChecks[safeIndex] ?? null;

  if (role && role !== "admin") {
    return null;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        <Button
          variant="outline"
          intensity="ghost"
          size="icon"
          onClick={() => router.push("/inventory")}
          aria-label="Back to inventory"
        >
          <ChevronLeft />
        </Button>

        <span className="flex-1 text-sm font-semibold">Inventory History</span>

        {/* Decimal / Sub-Units toggle */}
        <div className="flex items-center rounded-md border border-border overflow-hidden text-xs shrink-0">
          <button
            onClick={() => {
              savedDisplayMode = "decimal";
              setDisplayMode("decimal");
            }}
            className={[
              "px-2.5 py-1 transition-colors",
              displayMode === "decimal"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-accent/10",
            ].join(" ")}
          >
            Decimal
          </button>
          <button
            onClick={() => {
              savedDisplayMode = "subUnits";
              setDisplayMode("subUnits");
            }}
            className={[
              "px-2.5 py-1 transition-colors border-l border-border",
              displayMode === "subUnits"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-accent/10",
            ].join(" ")}
          >
            Sub-Units
          </button>
        </div>
      </div>

      {/* Date selector trigger — full width row below header */}
      <Sheet open={dateSheetOpen} onOpenChange={setDateSheetOpen}>
        <SheetTrigger asChild>
          <button
            className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card hover:bg-accent/10 transition-colors shrink-0"
            aria-label="Select check date"
          >
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-left text-sm font-medium">
              {selectedCheck?.checkDate ?? "Select Date"}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 flex flex-col p-0">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="text-sm">Select Date</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {hydratedChecks.map((check, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedIndex(index);
                  setDateSheetOpen(false);
                }}
                className={[
                  "w-full text-left px-4 py-3 border-b border-border transition-colors",
                  index === safeIndex
                    ? "bg-accent/20 text-foreground"
                    : "text-muted-foreground hover:bg-accent/10",
                ].join(" ")}
              >
                <span
                  className={[
                    "block text-sm",
                    index === safeIndex ? "font-semibold" : "",
                  ].join(" ")}
                >
                  {check.checkDate}
                </span>
                <span className="block text-xs text-muted-foreground/60 truncate">
                  {check.createdBy}
                </span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content — full width */}
      <div className="flex-1 overflow-y-auto">
        {hydratedChecks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No inventory checks recorded yet.
            </p>
          </div>
        ) : selectedCheck ? (
          <HistoryCheckDetail
            check={selectedCheck}
            displayMode={displayMode}
            key={selectedCheck.checkDate}
          />
        ) : (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-sm text-muted-foreground">
              Tap the date above to select a check.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
