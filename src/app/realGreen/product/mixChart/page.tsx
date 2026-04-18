"use client";
import { useState } from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { Container } from "@/components/Containers";
import { PDFViewer } from "@react-pdf/renderer";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import {
  buildMixChartGroups,
  generateMixChartData,
  generateMixChartByProductAmount,
  MixChartConstituentKey,
} from "@/app/realGreen/product/mixChart/_lib/mixChartUtils";
import { MixChartPDF } from "./chartLayouts/mixChartBySize";
import { MixChartByProductAmountPDF } from "./chartLayouts/mixChartByProductAmount";
import { UnitContext } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { ProductsFooter } from "@/app/realGreen/product/list/tabs/components/ProductsFooter";

export default function MixChartPage() {
  useProduct({ autoLoad: true });
  const isClient = useIsClient();
  const masters = useSelector(productSelect.productMasters);

  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<MixChartConstituentKey | null>(null);
  const [unitContext, setUnitContext] = useState<UnitContext>("load");
  const [increment, setIncrement] = useState<number>(10);
  const [rowCount, setRowCount] = useState<number>(17);

  // Debounce increment and row count to avoid re-rendering PDF on every keystroke
  const debouncedIncrement = useDebounce(increment, 100);
  const debouncedRowCount = useDebounce(rowCount, 100);

  const selectedMaster = masters.find((m) => m.productId === selectedMasterId);

  // Build equipment groups from the selected package (null = no package / fallback)
  const groups = selectedMaster
    ? buildMixChartGroups(selectedMaster, selectedPackageId)
    : null;

  // Resolve the selected key constituent's unit config display for the unit type selector
  let selectedKeyUnitConfigDisplay = null;
  if (selectedKey && groups) {
    for (const group of groups) {
      for (const constituent of group.constituents) {
        if (
          selectedKey.type === "water" &&
          constituent.isWater &&
          group.equipment.equipmentId === selectedKey.equipmentId
        ) {
          selectedKeyUnitConfigDisplay = constituent.unitConfigDisplay;
          break;
        }
        if (
          selectedKey.type === "solute" &&
          !constituent.isWater &&
          constituent.subProductConfig?.subId === selectedKey.subId
        ) {
          selectedKeyUnitConfigDisplay = constituent.unitConfigDisplay;
          break;
        }
      }
      if (selectedKeyUnitConfigDisplay) break;
    }
  } else if (selectedKey?.type === "solute" && !groups && selectedMaster) {
    const config = selectedMaster.subProductConfigs.find(
      (c) => c.subId === selectedKey.subId,
    );
    selectedKeyUnitConfigDisplay = config?.subProduct.unitConfigDisplay ?? null;
  }

  // Calculate max values based on debounced increment and row count
  const maxSize = debouncedIncrement * debouncedRowCount;
  const maxUnits = debouncedIncrement * debouncedRowCount;

  // Generate chart data
  const chartDataBySize = selectedMaster
    ? generateMixChartData(selectedMaster, debouncedIncrement, maxSize, groups)
    : [];

  const chartDataByProductAmount =
    selectedMaster && selectedKey
      ? generateMixChartByProductAmount(
          selectedMaster,
          selectedKey,
          debouncedIncrement,
          maxUnits,
          unitContext,
          groups,
        )
      : [];

  const hasKeySelected = selectedKey !== null;

  if (!isClient) return null;

  return (
    <Container variant={"page"}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Mix Chart</h1>

        {/* Controls Row */}
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-2">
            <Label>Master Product</Label>
            <Select
              value={selectedMasterId?.toString() || ""}
              onValueChange={(value) => {
                const master = masters.find((m) => m.productId === Number(value));
                setSelectedMasterId(Number(value));
                // Default to the master's default package
                setSelectedPackageId(master?.defaultPackage?.packageId ?? null);
                setSelectedKey(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Master Product" />
              </SelectTrigger>
              <SelectContent>
                {masters.map((master) => (
                  <SelectItem
                    key={master.productId}
                    value={master.productId.toString()}
                  >
                    {master.productCode} - {master.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipment Package Selector */}
          {selectedMaster && selectedMaster.equipmentPackages.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Equipment Package</Label>
              <Select
                value={selectedPackageId ?? "none"}
                onValueChange={(value) => {
                  setSelectedPackageId(value === "none" ? null : value);
                  setSelectedKey(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None - Chemicals Only" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None - Chemicals Only</SelectItem>
                  {selectedMaster.equipmentPackages.map((pkg) => (
                    <SelectItem key={pkg.packageId} value={pkg.packageId}>
                      {pkg.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Key Constituent Selector */}
          {selectedMaster && (
            <div className="flex flex-col gap-2">
              <Label>Key Product (Optional)</Label>
              <Select
                value={
                  selectedKey
                    ? selectedKey.type === "water"
                      ? `water:${selectedKey.equipmentId}`
                      : `solute:${selectedKey.subId}`
                    : "none"
                }
                onValueChange={(value) => {
                  if (value === "none") {
                    setSelectedKey(null);
                    return;
                  }
                  if (value.startsWith("water:")) {
                    setSelectedKey({ type: "water", equipmentId: value.slice(6) });
                  } else if (value.startsWith("solute:")) {
                    setSelectedKey({ type: "solute", subId: Number(value.slice(7)) });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None - Chart by Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None - Chart by Size</SelectItem>
                  {/* Water rows (only when a package is selected) */}
                  {groups?.map((group) => (
                    <SelectItem
                      key={`water:${group.equipment.equipmentId}`}
                      value={`water:${group.equipment.equipmentId}`}
                    >
                      Water ({group.equipment.description})
                    </SelectItem>
                  ))}
                  {/* Chemical solute rows */}
                  {groups
                    ? // When package selected: show solutes that appear in any group
                      groups
                        .flatMap((group) =>
                          group.constituents
                            .filter((c) => !c.isWater)
                            .map((c) => c.subProductConfig!)
                            .filter(Boolean),
                        )
                        // Deduplicate by subId
                        .filter(
                          (config, idx, arr) =>
                            arr.findIndex((c) => c.subId === config.subId) === idx,
                        )
                        .map((config) => (
                          <SelectItem
                            key={`solute:${config.subId}`}
                            value={`solute:${config.subId}`}
                          >
                            {config.subProduct.description}
                          </SelectItem>
                        ))
                    : // Fallback: all sub-product configs
                      selectedMaster.subProductConfigs.map((config) => (
                        <SelectItem
                          key={`solute:${config.subId}`}
                          value={`solute:${config.subId}`}
                        >
                          {config.subProduct.description}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Unit Type Selector — only shown when a key constituent is selected */}
          {hasKeySelected && selectedKeyUnitConfigDisplay && (
            <div className="flex flex-col gap-2">
              <Label>Unit Type</Label>
              <RadioGroup
                variant="button-group"
                value={unitContext}
                onValueChange={(value) => setUnitContext(value as UnitContext)}
              >
                <RadioGroupItem value="load">
                  {selectedKeyUnitConfigDisplay.getUnitLabel("load")}
                </RadioGroupItem>
                <RadioGroupItem value="app">
                  {selectedKeyUnitConfigDisplay.getUnitLabel("app")}
                </RadioGroupItem>
              </RadioGroup>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>{hasKeySelected ? "Increment" : "Size Increment"}</Label>
            <Input
              type="number"
              value={increment}
              onChange={(e) => setIncrement(Number(e.target.value) || 1)}
              className="w-32"
              min={1}
              max={50}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Row Count</Label>
            <Input
              type="number"
              value={rowCount}
              onChange={(e) => setRowCount(Number(e.target.value) || 1)}
              className="w-32"
              min={1}
              max={100}
            />
          </div>
        </div>

        {/* PDF Viewer */}
        {selectedMaster && (
          <div className={"w-full h-[75vh] overflow-y-auto"}>
            <PDFViewer style={{ width: "100%", height: "100%" }}>
              {hasKeySelected && selectedKey ? (
                <MixChartByProductAmountPDF
                  master={selectedMaster}
                  selectedKey={selectedKey}
                  chartData={chartDataByProductAmount}
                  groups={groups}
                />
              ) : (
                <MixChartPDF
                  master={selectedMaster}
                  chartData={chartDataBySize}
                  groups={groups}
                />
              )}
            </PDFViewer>
          </div>
        )}
      </div>

      <ProductsFooter />
    </Container>
  );
}
