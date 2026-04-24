"use client";

import { useSelector } from "react-redux";
import { quickSendSelect } from "../quickSendSelect";
import { QuickSendEditor } from "./QuickSendEditor";
import { QuickSendMenubar } from "../storedTemplates/components/QuickSendMenubar";
import { CustomerLookup } from "../controls/CustomerLookup";
import { NameOverride } from "../controls/NameOverride";
import { SizeOverride } from "../controls/SizeOverride";
import { TaxRateOverride } from "../controls/TaxRateOverride";
import { ProgramConfig } from "../controls/ProgramConfig";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { usePriceTable } from "@/app/realGreen/priceTable/usePriceTable";
import { useStoredTemplates } from "../storedTemplates/useStoredTemplates";
import type { TemplateControlId } from "../QuickSendTypes";
import { usePrepay } from "@/app/realGreen/prepay/usePrepay";
import { useZipCode } from "@/app/realGreen/zipCode/useZipCode";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";

export function QuickSend() {
  useCustomerContext({ contexts: ["single"] });
  useProgServ({ autoLoad: true });
  usePriceTable({ autoLoad: true });
  usePrepay({ autoLoad: true });
  useZipCode({ autoLoad: true });
  useStoredTemplates({ autoLoad: true });
  useGlobalSettings({ autoLoad: true });

  const controlIds = useSelector(quickSendSelect.activeControlIds);
  const programConfigs = useSelector(quickSendSelect.programConfigs);
  const loadedTemplateId = useSelector(quickSendSelect.loadedTemplateId);

  const programConfigMap = new Map(programConfigs.map((c) => [c.alias, c]));

  const renderControl = (id: TemplateControlId) => {
    if (id === "customerLookup") return <CustomerLookup key="customerLookup" />;
    if (id === "nameOverride") return <NameOverride key="nameOverride" />;
    if (id === "sizeOverride") return <SizeOverride key="sizeOverride" />;
    if (id === "taxRateOverride")
      return <TaxRateOverride key="taxRateOverride" />;
    if (id.startsWith("programConfig:")) {
      const alias = id.slice("programConfig:".length);
      const config = programConfigMap.get(alias);
      if (!config) return null;
      return <ProgramConfig key={id} config={config} />;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <QuickSendMenubar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — controls */}
        <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border shrink-0">
            <h2 className="text-sm font-semibold">Controls</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {controlIds.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground px-4 text-center">
                Type <span className="mx-1 font-mono text-primary">@</span> in
                the template to insert variables.
              </div>
            ) : (
              controlIds.map(renderControl)
            )}
          </div>
        </div>

        {/* Right panel — stacked editors.
            key resets collapsible open states when the loaded template changes. */}
        <div className="flex-1 overflow-hidden">
          <QuickSendEditor
            key={loadedTemplateId ?? "new"}
            hasLoadedTemplate={loadedTemplateId !== null}
          />
        </div>
      </div>
    </div>
  );
}
