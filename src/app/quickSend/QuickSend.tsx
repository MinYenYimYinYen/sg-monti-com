"use client";

import { useSelector } from "react-redux";
import { quickSendSelect } from "./quickSendSelect";
import { QuickSendEditor } from "./QuickSendEditor";
import { CustomerLookup } from "./CustomerLookup";
import { NameOverride } from "./NameOverride";
import { SizeOverride } from "./SizeOverride";
import { ProgramConfig } from "./ProgramConfig";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { usePriceTable } from "@/app/realGreen/priceTable/usePriceTable";
import type { TemplateControlId } from "./QuickSendTypes";

export function QuickSend() {
  useCustomerContext({ contexts: ["single"] });
  useProgServ({ autoLoad: true });
  usePriceTable({ autoLoad: true });

  const controlIds = useSelector(quickSendSelect.activeControlIds);
  const programConfigs = useSelector(quickSendSelect.programConfigs);

  const programConfigMap = new Map(programConfigs.map((c) => [c.alias, c]));

  const renderControl = (id: TemplateControlId) => {
    if (id === "customerLookup") return <CustomerLookup key="customerLookup" />;
    if (id === "nameOverride") return <NameOverride key="nameOverride" />;
    if (id === "sizeOverride") return <SizeOverride key="sizeOverride" />;
    if (id.startsWith("programConfig:")) {
      const alias = id.slice("programConfig:".length);
      const config = programConfigMap.get(alias);
      if (!config) return null;
      return <ProgramConfig key={id} config={config} />;
    }
    return null;
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left panel — controls */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">Controls</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {controlIds.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground px-4 text-center">
              Type{" "}
              <span className="mx-1 font-mono text-primary">@</span>
              {" "}in the template to insert variables.
            </div>
          ) : (
            controlIds.map(renderControl)
          )}
        </div>
      </div>

      {/* Right panel — stacked editors */}
      <div className="flex-1 overflow-hidden">
        <QuickSendEditor />
      </div>
    </div>
  );
}
