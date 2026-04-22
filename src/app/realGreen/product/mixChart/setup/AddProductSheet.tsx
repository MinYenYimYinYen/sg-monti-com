"use client";
import { useState } from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/style/components/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/style/components/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { Checkbox } from "@/style/components/checkbox";
import { Label } from "@/style/components/label";
import { Input } from "@/style/components/input";
import { Button } from "@/style/components/button";
import { MixChartProductRow } from "@/app/realGreen/product/mixChart/_lib/MixChartTypes";
import { nanoid } from "@reduxjs/toolkit";

type AddProductSheetProps = {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  onAddAction: (rows: MixChartProductRow[]) => void;
};

export function AddProductSheet({ open, onOpenChangeAction:onOpenChange, onAddAction:onAdd }: AddProductSheetProps) {
  const masters = useSelector(productSelect.productMasters);
  const subs = useSelector(productSelect.productSubs);
  const singles = useSelector(productSelect.productSingles);

  // Master tab state
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
  const [checkedSubIds, setCheckedSubIds] = useState<Set<number>>(new Set());

  // Sub tab state
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [subRate, setSubRate] = useState<string>("");

  // Single tab state
  const [selectedSingleId, setSelectedSingleId] = useState<number | null>(null);
  const [singleRate, setSingleRate] = useState<string>("");

  // Manual tab state
  const [manualLabel, setManualLabel] = useState("");
  const [manualRate, setManualRate] = useState<string>("");

  const selectedMaster = masters.find((m) => m.productId === selectedMasterId);

  const handleAddFromMaster = () => {
    if (!selectedMaster) return;
    const rows: MixChartProductRow[] = selectedMaster.subProductConfigs
      .filter((config) => checkedSubIds.has(config.subId))
      .map((config) => ({
        id: nanoid(),
        label: config.subProduct.description,
        rate: config.rate,
        unitConfigDisplay: config.subProduct.unitConfigDisplay,
        source: { type: "master-sub", masterProductId: selectedMaster.productId, subId: config.subId },
      }));
    if (rows.length === 0) return;
    onAdd(rows);
    setCheckedSubIds(new Set());
    onOpenChange(false);
  };

  const handleAddFromSub = () => {
    const sub = subs.find((s) => s.productId === selectedSubId);
    if (!sub) return;
    const rate = parseFloat(subRate);
    if (isNaN(rate)) return;
    onAdd([{
      id: nanoid(),
      label: sub.description,
      rate,
      unitConfigDisplay: sub.unitConfigDisplay,
      source: { type: "sub", productId: sub.productId },
    }]);
    setSelectedSubId(null);
    setSubRate("");
    onOpenChange(false);
  };

  const handleAddFromSingle = () => {
    const single = singles.find((s) => s.productId === selectedSingleId);
    if (!single) return;
    const rate = parseFloat(singleRate);
    if (isNaN(rate)) return;
    onAdd([{
      id: nanoid(),
      label: single.description,
      rate,
      unitConfigDisplay: single.unitConfigDisplay,
      source: { type: "single", productId: single.productId },
    }]);
    setSelectedSingleId(null);
    setSingleRate("");
    onOpenChange(false);
  };

  const handleAddManual = () => {
    if (!manualLabel.trim()) return;
    const rate = parseFloat(manualRate);
    if (isNaN(rate)) return;
    // Manual rows use a generic Gal/1000 unit config display — user picks the unit label
    const sub = subs[0]; // borrow any sub's unitConfigDisplay as a fallback
    if (!sub) return;
    onAdd([{
      id: nanoid(),
      label: manualLabel.trim(),
      rate,
      unitConfigDisplay: sub.unitConfigDisplay,
      source: { type: "manual" },
    }]);
    setManualLabel("");
    setManualRate("");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[480px]">
        <SheetHeader>
          <SheetTitle>Add Product</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="master" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="master" className="flex-1">From Master</TabsTrigger>
            <TabsTrigger value="sub" className="flex-1">Sub-Product</TabsTrigger>
            <TabsTrigger value="single" className="flex-1">Single</TabsTrigger>
          </TabsList>

          {/* From Master */}
          <TabsContent value="master" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Master Product</Label>
              <Select
                value={selectedMasterId?.toString() ?? ""}
                onValueChange={(v) => {
                  setSelectedMasterId(Number(v));
                  setCheckedSubIds(new Set());
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select master product" />
                </SelectTrigger>
                <SelectContent>
                  {masters.map((m) => (
                    <SelectItem key={m.productId} value={m.productId.toString()}>
                      {m.productCode} — {m.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMaster && (
              <div className="space-y-2">
                <Label>Sub-Products</Label>
                {selectedMaster.subProductConfigs.map((config) => (
                  <div key={config.subId} className="flex items-center gap-3">
                    <Checkbox
                      id={`sub-${config.subId}`}
                      checked={checkedSubIds.has(config.subId)}
                      onCheckedChange={(checked) => {
                        const next = new Set(checkedSubIds);
                        if (checked) next.add(config.subId);
                        else next.delete(config.subId);
                        setCheckedSubIds(next);
                      }}
                    />
                    <Label htmlFor={`sub-${config.subId}`} className="flex-1 cursor-pointer">
                      {config.subProduct.description}
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({config.rate} {config.subProduct.unitConfig.conversions.app.unitLabel}/1000)
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleAddFromMaster}
              disabled={checkedSubIds.size === 0}
              className="w-full"
            >
              Add Selected ({checkedSubIds.size})
            </Button>
          </TabsContent>

          {/* From Sub-Product */}
          <TabsContent value="sub" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Sub-Product</Label>
              <Select
                value={selectedSubId?.toString() ?? ""}
                onValueChange={(v) => setSelectedSubId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-product" />
                </SelectTrigger>
                <SelectContent>
                  {subs.map((s) => (
                    <SelectItem key={s.productId} value={s.productId.toString()}>
                      {s.productCode} — {s.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rate (per 1000 sq ft)</Label>
              <Input
                type="number"
                placeholder="e.g. 0.5"
                value={subRate}
                onChange={(e) => setSubRate(e.target.value)}
                step="0.01"
              />
            </div>

            <Button
              onClick={handleAddFromSub}
              disabled={!selectedSubId || !subRate}
              className="w-full"
            >
              Add Sub-Product
            </Button>
          </TabsContent>

          {/* From Single */}
          <TabsContent value="single" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Single Product</Label>
              <Select
                value={selectedSingleId?.toString() ?? ""}
                onValueChange={(v) => setSelectedSingleId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select single product" />
                </SelectTrigger>
                <SelectContent>
                  {singles.map((s) => (
                    <SelectItem key={s.productId} value={s.productId.toString()}>
                      {s.productCode} — {s.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rate (per 1000 sq ft)</Label>
              <Input
                type="number"
                placeholder="e.g. 0.5"
                value={singleRate}
                onChange={(e) => setSingleRate(e.target.value)}
                step="0.01"
              />
            </div>

            <Button
              onClick={handleAddFromSingle}
              disabled={!selectedSingleId || !singleRate}
              className="w-full"
            >
              Add Single Product
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
