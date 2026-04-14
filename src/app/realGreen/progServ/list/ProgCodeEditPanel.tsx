"use client";

import React from "react";
import { useSelector } from "react-redux";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { priceTableSelect } from "@/app/realGreen/priceTable/priceTableSelect";
import { Card, CardContent, CardHeader, CardTitle } from "@/style/components/card";
import { Label } from "@/style/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { PriceTable } from "@/app/realGreen/priceTable/_types/PriceTableTypes";

const NONE_VALUE = "__none__";

type ProgCodeEditPanelProps = {
  progCodeId: string;
};

function PriceTableOptions({ priceTables }: { priceTables: PriceTable[] }) {
  const items: React.ReactNode[] = [];
  for (const pt of priceTables) {
    items.push(
      <SelectItem key={pt.priceTableId} value={String(pt.priceTableId)}>
        {pt.desc}
      </SelectItem>,
    );
  }
  return <>{items}</>;
}

export function ProgCodeEditPanel({ progCodeId }: ProgCodeEditPanelProps) {
  const { saveProgCodeEconPriceTable } = useProgServ({});

  const progCodeMap = useSelector(progServSelect.progCodeMap);
  const priceTables = useSelector(priceTableSelect.priceTables);

  const progCode = progCodeMap.get(progCodeId);
  if (!progCode) return null;

  const handleEconChange = (value: string) => {
    const econPriceTableId = value === NONE_VALUE ? null : Number(value);
    saveProgCodeEconPriceTable({ progCodeId, econPriceTableId });
  };

  const econSelectValue =
    progCode.econPriceTableId != null
      ? String(progCode.econPriceTableId)
      : NONE_VALUE;

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <CardHeader className="py-3 shrink-0">
        <CardTitle className="text-base">{progCodeId}</CardTitle>
        <p className="text-sm text-muted-foreground">{progCode.description}</p>
      </CardHeader>

      <CardContent className="flex-1 p-4 pt-0">
        <div className="space-y-6">
          {/* Default Price Table (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Default Price Table</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {progCode.priceTable ? progCode.priceTable.desc : "None"}
            </div>
          </div>

          {/* Econ Price Table (editable) */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Economy Price Table</Label>
            <p className="text-xs text-muted-foreground">
              Override the price table used for economy pricing calculations.
            </p>
            <Select value={econSelectValue} onValueChange={handleEconChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a price table…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>
                  <span className="text-muted-foreground">None</span>
                </SelectItem>
                <PriceTableOptions priceTables={priceTables} />
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
