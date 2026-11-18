"use client";

import { useState } from "react";
import { Badge } from "@/style/components/badge";
import { Checkbox } from "@/style/components/checkbox";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Switch } from "@/style/components/switch";
import { MnTaxType } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";
import {
  MN_JURISDICTION_LABELS,
  filterMnTaxTypes,
  groupMnTaxTypesByJurisdiction,
} from "@/app/salesTax/salesTaxMapping/_lib/mnTaxTypeLogic";

/**
 * The searchable list of every tax type on offer. It owns only its search and filter state; which
 * types are chosen belongs to the dialog, so a click is handed up as a callback.
 */
export function MnTaxTypePicker({
  mnTaxTypes,
  selected,
  onToggleAction,
}: {
  mnTaxTypes: MnTaxType[];
  selected: MnTaxType[];
  onToggleAction: (mnTaxType: MnTaxType) => void;
}) {
  const [search, setSearch] = useState("");
  const [showEnded, setShowEnded] = useState(false);

  const selectedCodes = new Set(selected.map((mnTaxType) => mnTaxType.code));
  const groups = groupMnTaxTypesByJurisdiction(
    filterMnTaxTypes({ mnTaxTypes, search, showEnded, selectedCodes }),
  );

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center gap-3">
        <Input
          value={search}
          placeholder="Search code, name or FIPS"
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex shrink-0 items-center gap-2">
          <Switch id="showEndedMnTaxTypes" checked={showEnded} onCheckedChange={setShowEnded} />
          <Label htmlFor="showEndedMnTaxTypes">Show ended</Label>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border bg-card">
        {groups.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">No tax types match.</p>
        )}
        {groups.map((group) => (
          <div key={group.jurisdiction}>
            <p className="sticky top-0 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase text-muted-foreground backdrop-blur-sm">
              {MN_JURISDICTION_LABELS[group.jurisdiction]}
            </p>
            {group.mnTaxTypes.map((mnTaxType) => (
              <label
                key={mnTaxType.code}
                className="flex cursor-pointer items-center gap-3 px-3 py-1.5 text-sm hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedCodes.has(mnTaxType.code)}
                  onCheckedChange={() => onToggleAction(mnTaxType)}
                />
                <span className="w-9 shrink-0 font-mono">{mnTaxType.code}</span>
                <span className="flex-1">{mnTaxType.description}</span>
                {mnTaxType.endedOn !== null && (
                  <Badge variant="destructive" intensity="ghost">
                    Ended {mnTaxType.endedOn}
                  </Badge>
                )}
                <span className="w-14 shrink-0 text-right tabular-nums">
                  {mnTaxType.ratePercent}%
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
