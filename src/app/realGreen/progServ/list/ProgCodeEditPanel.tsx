"use client";

import React from "react";
import { useSelector } from "react-redux";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { priceTableSelect } from "@/app/realGreen/priceTable/priceTableSelect";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/style/components/card";
import { Label } from "@/style/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { Button } from "@/style/components/button";
import { PriceTable } from "@/app/realGreen/priceTable/_types/PriceTableTypes";
import { AppState } from "@/store";

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

const selectUnsavedProgCodeChanges = (state: AppState) =>
  state.progServ.unsavedProgCodeChanges;

export function ProgCodeEditPanel({ progCodeId }: ProgCodeEditPanelProps) {
  const { updateProgCode, revertProgCode, saveProgCodeChanges } = useProgServ(
    {},
  );

  const progCodeMap = useSelector(progServSelect.progCodeMap);
  const priceTables = useSelector(priceTableSelect.priceTables);
  const unsavedProgCodeChanges = useSelector(selectUnsavedProgCodeChanges);

  const progCode = progCodeMap.get(progCodeId);
  if (!progCode) return null;

  const isDirty = unsavedProgCodeChanges.some(
    (c) => c.updated.progCodeId === progCodeId,
  );

  const handlePrefChange = (value: string) => {
    updateProgCode({
      progCodeId,
      prefPriceTableId: value === NONE_VALUE ? null : Number(value),
    });
  };

  const handleEconChange = (value: string) => {
    updateProgCode({
      progCodeId,
      econPriceTableId: value === NONE_VALUE ? null : Number(value),
    });
  };

  const handleSave = () => {
    saveProgCodeChanges(unsavedProgCodeChanges);
  };

  const handleRevert = () => {
    revertProgCode(progCodeId);
  };

  const prefSelectValue =
    progCode.prefPriceTableId != null
      ? String(progCode.prefPriceTableId)
      : NONE_VALUE;

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

      <CardContent className="flex-1 p-4 pt-0 overflow-y-auto">
        <div className="space-y-6">
          {/* Preferred Price Table */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Preferred Price Table</Label>
            <p className="text-xs text-muted-foreground">
              The standard price table used for this program.
            </p>
            <Select value={prefSelectValue} onValueChange={handlePrefChange}>
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

          {/* Economy Price Table */}
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

      {isDirty && (
        <CardFooter className="border-t py-3 gap-2 justify-end shrink-0">
          <Button variant="secondary" intensity="ghost" onClick={handleRevert}>
            Revert
          </Button>
          <Button variant="primary" intensity="solid" onClick={handleSave}>
            Save Changes
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
