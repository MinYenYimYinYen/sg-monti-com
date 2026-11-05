"use client";

import { useSelector } from "react-redux";
import { importDecisionSelect } from "@/app/qbo/importCCTxn/decisions/importDecisionSelect";
import { MapRowLine } from "@/app/qbo/importCCTxn/_components/MapRowLine";
import { MapSaveBar } from "@/app/qbo/importCCTxn/_components/MapSaveBar";

/**
 * Every pending transaction on its own row, with the rows of one merchant side by side. The panel
 * itself is the scroll context, and the save bar sticks to its top.
 */
export function MapPanel() {
  const displayRowIds = useSelector(importDecisionSelect.displayRowIds);

  return (
    <div className="h-full overflow-y-auto">
      {displayRowIds.length === 0 ? (
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            Nothing to map. Import a file first; transactions that are still pending appear here.
          </p>
        </div>
      ) : (
        <>
          <MapSaveBar />
          <div className="space-y-2 p-6">
            <p className="text-sm text-muted-foreground">
              Choosing a vendor or account on one transaction fills in the same merchant&apos;s other
              transactions. Those are shaded and offer a tick to confirm. Nothing is saved until you
              press Save.
            </p>
            {displayRowIds.map((rowId) => (
              <MapRowLine key={rowId} rowId={rowId} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
