"use client";

import { Download, Upload } from "lucide-react";
import { Button } from "@/style/components/button";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";
import { useCustomerJson } from "@/app/realGreen/customer/json/useCustomerJson";

type CustomerJsonPanelProps = {
  contexts: CustomerContextMode[];
};

export function CustomerJsonPanel({ contexts }: CustomerJsonPanelProps) {
  const { save, load, hasData, totalCounts } = useCustomerJson(contexts);

  return (
    <div className="flex items-center gap-3">
      {hasData && (
        <span className="text-xs text-muted-foreground">
          {totalCounts.customers.toLocaleString()} customers ·{" "}
          {totalCounts.programs.toLocaleString()} programs ·{" "}
          {totalCounts.services.toLocaleString()} services
        </span>
      )}
      <Button
        variant="accent"
        intensity="soft"
        size="sm"
        className="gap-1.5"
        onClick={save}
        disabled={!hasData}
      >
        <Download className="h-3.5 w-3.5" />
        Save JSON
      </Button>
      <Button
        variant="accent"
        intensity="soft"
        size="sm"
        className="gap-1.5"
        onClick={load}
      >
        <Upload className="h-3.5 w-3.5" />
        Load JSON
      </Button>
    </div>
  );
}
