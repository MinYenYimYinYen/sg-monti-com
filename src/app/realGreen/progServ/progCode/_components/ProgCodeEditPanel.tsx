"use client";

import React from "react";
import { useSelector } from "react-redux";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
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
import { Input } from "@/style/components/input";
import { Switch } from "@/style/components/switch";
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

  const hasPrefTable = progCode.priceTable != null;
  const hasMultipleServCodes = progCode.servCodes.length > 1;
  const econEnabled = hasPrefTable && hasMultipleServCodes;
  const minForPrefEnabled = hasPrefTable && progCode.econPriceTable != null;

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

  const handleMinForPrefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    updateProgCode({
      progCodeId,
      minForPreferred: raw === "" ? null : Number(raw),
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

  const minForPrefValue =
    progCode.minForPreferred != null ? String(progCode.minForPreferred) : "";

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <CardHeader className="py-3 shrink-0">
        <CardTitle className="text-base">{progCodeId}</CardTitle>
        <p className="text-sm text-muted-foreground">{progCode.description}</p>
        <p className="text-xs text-muted-foreground">
          Service codes: {progCode.servCodes.length}
        </p>
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
            <Label
              className={
                econEnabled
                  ? "text-sm font-medium"
                  : "text-sm font-medium text-muted-foreground"
              }
            >
              Economy Price Table
            </Label>
            <p className="text-xs text-muted-foreground">
              {!hasPrefTable
                ? "Requires a preferred price table."
                : !hasMultipleServCodes
                  ? "Only available for programs with more than one service code."
                  : "Override the price table used for economy pricing calculations."}
            </p>
            <Select
              value={econSelectValue}
              onValueChange={handleEconChange}
              disabled={!econEnabled}
            >
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

          {/* Min For Preferred */}
          <div className="space-y-1.5">
            <Label
              className={
                minForPrefEnabled
                  ? "text-sm font-medium"
                  : "text-sm font-medium text-muted-foreground"
              }
            >
              Min Rounds for Preferred
            </Label>
            <p className="text-xs text-muted-foreground">
              {!hasPrefTable
                ? "Requires a preferred price table."
                : progCode.econPriceTable == null
                  ? "Requires an economy price table."
                  : "Minimum number of completed rounds before preferred pricing applies."}
            </p>
            <Input
              type="number"
              min={0}
              step={1}
              value={minForPrefValue}
              onChange={handleMinForPrefChange}
              disabled={!minForPrefEnabled}
              placeholder="None"
              className="w-full"
            />
          </div>
          {/* Monthly Installment Billing */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                Monthly Installment Billing
              </Label>
              <p className="text-xs text-muted-foreground">
                This program is billed by monthly installment in the CRM.
              </p>
            </div>
            <Switch
              checked={progCode.isInstallment}
              onCheckedChange={(checked: boolean) =>
                updateProgCode({ progCodeId, isInstallment: checked })
              }
            />
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
