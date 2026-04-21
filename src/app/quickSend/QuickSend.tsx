"use client";

import { useSelector } from "react-redux";
import { quickSendSelect } from "./quickSendSelect";
import { TemplateEditor } from "./TemplateEditor";
import { PreviewEditor } from "./PreviewEditor";
import { CustomerLookup } from "./CustomerLookup";
import { useContext } from "react";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";

export function QuickSend() {
  useCustomerContext({contexts: ["single"]})
  const activeVars = useSelector(quickSendSelect.activeVars);
  const showCustomerPanel = activeVars.has("name") || activeVars.has("size");

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left panel — controls */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">Controls</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {showCustomerPanel ? (
            <CustomerLookup />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground px-4 text-center">
              Type{" "}
              <span className="mx-1 font-mono text-primary">@</span>
              {" "}in the template to insert variables.
            </div>
          )}
        </div>
      </div>

      {/* Right panel — two stacked editors */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden border-b border-border">
          <TemplateEditor />
        </div>
        <div className="flex-1 overflow-hidden">
          <PreviewEditor />
        </div>
      </div>
    </div>
  );
}
