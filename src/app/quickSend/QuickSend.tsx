"use client";

import { useState } from "react";
import { QuickSendEditor } from "./QuickSendEditor";
import { CustomerLookup } from "./CustomerLookup";
import {
  initialQuickSendState,
  type QSCustomerState,
  type QSVariableKey,
  type QuickSendState,
} from "./QuickSendTypes";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";

export function QuickSend() {
  useCustomerContext({contexts: ["single"]})
  const [state, setState] = useState<QuickSendState>(initialQuickSendState);

  const handleVariablesChange = (vars: Set<QSVariableKey>) => {
    setState((prev) => ({ ...prev, activeVars: vars }));
  };

  const handleCustomerChange = (customer: QSCustomerState) => {
    setState((prev) => ({ ...prev, customer }));
  };

  const showCustomerPanel =
    state.activeVars.has("name") || state.activeVars.has("size");

  /** Resolved variable values passed to the editor for live mention updates. */
  const variables: Partial<Record<QSVariableKey, string>> = {
    name: state.customer.nameOverride || undefined,
    size: state.customer.sizeOverride || undefined,
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left panel */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Controls</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showCustomerPanel ? (
            <CustomerLookup
              state={state.customer}
              onChange={handleCustomerChange}
              showSize={state.activeVars.has("size")}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground px-4 text-center">
              Type <span className="mx-1 font-mono text-primary">@</span> in the editor to insert variables.
            </div>
          )}
        </div>
      </div>

      {/* Right panel — Tiptap editor */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <QuickSendEditor
          onVariablesChange={handleVariablesChange}
          variables={variables}
        />
      </div>
    </div>
  );
}
