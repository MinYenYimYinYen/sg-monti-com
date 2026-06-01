"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { authSelect } from "@/app/auth/authSlice";
import { inventorySelect } from "@/app/inventory/inventorySelect";
import { useInventoryDeps } from "@/app/inventory/useInventoryDeps";
import { HistoryCheckDetail } from "@/app/inventory/history/_components/HistoryCheckDetail";
import { Button } from "@/style/components/button";
import { ChevronLeft, History } from "lucide-react";

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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <Button
          variant="outline"
          intensity="ghost"
          size="icon"
          onClick={() => router.push("/inventory")}
          aria-label="Back to inventory"
        >
          <ChevronLeft />
        </Button>
        <span className="flex items-center gap-2 text-base font-semibold flex-1">
          <History className="h-4 w-4 text-muted-foreground" />
          Inventory History
        </span>

        {/* Decimal / Sub-Units toggle */}
        <div className="flex items-center rounded-md border border-border overflow-hidden text-xs">
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

      {hydratedChecks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No inventory checks recorded yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — date list */}
          <div className="w-36 shrink-0 border-r border-border overflow-y-auto">
            {hydratedChecks.map((check, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={[
                  "w-full text-left px-3 py-3 border-b border-border transition-colors",
                  index === safeIndex
                    ? "bg-accent/20 text-foreground"
                    : "text-muted-foreground hover:bg-accent/10",
                ].join(" ")}
              >
                <span className={["block text-sm", index === safeIndex ? "font-semibold" : ""].join(" ")}>
                  {check.checkDate}
                </span>
                <span className="block text-xs text-muted-foreground/60 truncate">
                  {check.createdBy}
                </span>
              </button>
            ))}
          </div>

          {/* Right panel — check detail */}
          <div className="flex-1 overflow-y-auto">
            {selectedCheck ? (
              <HistoryCheckDetail
                check={selectedCheck}
                displayMode={displayMode}
                key={selectedCheck.checkDate}
              />
            ) : (
              <div className="flex items-center justify-center h-full p-8">
                <p className="text-sm text-muted-foreground">
                  Select a date to view details.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
