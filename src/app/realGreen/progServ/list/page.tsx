"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Container } from "@/components/Containers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { usePriceTable } from "@/app/realGreen/priceTable/usePriceTable";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { ProgCodeListPanel } from "./ProgCodeListPanel";
import { ProgCodeEditPanel } from "./ProgCodeEditPanel";

export default function ProgServListPage() {
  useProgServ({ autoLoad: true });
  usePriceTable({ autoLoad: true });

  const progCodes = useSelector(progServSelect.progCodes);
  const [selectedProgCodeId, setSelectedProgCodeId] = useState<string | null>(null);

  return (
    <Container variant="page">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">Program Codes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          View program codes and assign economy price tables.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-4" style={{ height: "calc(100vh - 180px)" }}>
        {/* Left: list */}
        <ProgCodeListPanel
          progCodes={progCodes}
          selectedProgCodeId={selectedProgCodeId}
          onSelect={setSelectedProgCodeId}
        />

        {/* Right: edit panel or empty state */}
        <div className="flex-1 min-w-0">
          {selectedProgCodeId ? (
            <ProgCodeEditPanel
              key={selectedProgCodeId}
              progCodeId={selectedProgCodeId}
            />
          ) : (
            <div className="flex items-center justify-center h-full border-2 border-dashed border-muted rounded-lg">
              <p className="text-muted-foreground">
                Select a program code to view its price table configuration
              </p>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
