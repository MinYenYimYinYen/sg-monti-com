"use client";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Container } from "@/components/Containers";
import { PDFViewer } from "@react-pdf/renderer";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useEquipment } from "@/app/equipment/useEquipment";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { ScrollArea } from "@/style/components/scroll-area";
import {
  buildMixChartColumns,
  calcWaterRatePerKsf,
  generateMixChartData,
  generateMixChartByProductAmount,
  MixChartColumn,
  MixChartKeyId,
} from "@/app/realGreen/product/mixChart/_lib/mixChartUtils";
import { MixChartConfig } from "@/app/realGreen/product/mixChart/_lib/MixChartTypes";
import { MixChartPDF } from "./chartLayouts/mixChartBySize";
import { MixChartByProductAmountPDF } from "./chartLayouts/mixChartByProductAmount";
import { MixChartSetup } from "./setup/MixChartSetup";
import { UnitContext } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { ProductsFooter } from "@/app/realGreen/product/list/tabs/components/ProductsFooter";
import { solverSelect } from "@/app/appMethod/appMethodCreate/selectors/solverSelect";
import { useSelector as useReduxSelector } from "react-redux";

const DEFAULT_CONFIG: MixChartConfig = {
  equipment: null,
  appMethodOverride: null,
  includeWater: false,
  products: [],
};

export default function MixChartPage() {
  useProduct({ autoLoad: true });
  useEquipment({ autoLoad: true });
  const isClient = useIsClient();

  // Chart config — the full mix definition
  const [config, setConfig] = useState<MixChartConfig>(DEFAULT_CONFIG);

  // Chart display controls
  const [keyId, setKeyId] = useState<MixChartKeyId | null>(null);
  const [unitContext, setUnitContext] = useState<UnitContext>("load");
  const [increment, setIncrement] = useState<number>(10);
  const [rowCount, setRowCount] = useState<number>(17);

  const debouncedIncrement = useDebounce(increment, 100);
  const debouncedRowCount = useDebounce(rowCount, 100);

  // Read the live solver solution for the AppMethod override
  const solution = useReduxSelector(solverSelect.solution);
  const effectiveAppMethod = solution?.success ? solution.result : config.equipment?.appMethod ?? null;

  // Derive water rate from the effective AppMethod
  const waterRatePerKsf =
    config.equipment && effectiveAppMethod && config.includeWater
      ? calcWaterRatePerKsf(effectiveAppMethod, config.products, config.equipment.showFlOz)
      : null;

  // Build columns
  const columns: MixChartColumn[] = buildMixChartColumns({
    products: config.products,
    waterRatePerKsf,
    includeWater: config.includeWater,
    showFlOz: config.equipment?.showFlOz ?? false,
  });

  const maxSize = debouncedIncrement * debouncedRowCount;
  const maxUnits = debouncedIncrement * debouncedRowCount;

  // Generate chart data
  const chartDataBySize = generateMixChartData(columns, debouncedIncrement, maxSize);

  // Resolve key column
  const keyColumn = keyId === null
    ? null
    : keyId === "water"
      ? columns.find((c) => c.isWater) ?? null
      : columns.find((c) => !c.isWater && c.label === keyId) ?? null;

  const otherColumns = keyColumn ? columns.filter((c) => c !== keyColumn) : [];

  const chartDataByProductAmount =
    keyColumn && keyId !== null
      ? generateMixChartByProductAmount(columns, keyId, debouncedIncrement, maxUnits, unitContext)
      : [];

  const hasColumns = columns.length > 0;
  const hasKeySelected = keyId !== null && keyColumn !== null;

  // Chart title
  const chartTitle = config.equipment
    ? `Mix Chart — ${config.equipment.description}`
    : "Mix Chart";

  if (!isClient) return null;

  return (
    <Container variant={"scroll-shell"}>
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <h1 className="text-2xl font-bold shrink-0">Mix Chart</h1>

        <div className="grid grid-cols-[auto_1fr] gap-6 flex-1 min-h-0">
          {/* Left panel: Setup — scrolls independently */}
          <div className="rounded-lg border border-border bg-card/30 overflow-hidden h-full">
            <ScrollArea className="h-full">
              <div className="p-4">
                <MixChartSetup config={config} onConfigChange={setConfig} />
              </div>
            </ScrollArea>
          </div>

          {/* Right panel: Chart controls + PDF */}
          <div className="flex flex-col h-full gap-4">
            {/* Chart controls */}
            <div className="flex gap-4 items-end flex-wrap shrink-0">
              {/* Key Column Selector */}
              {hasColumns && (
                <div className="flex flex-col gap-2">
                  <Label>Key Column (Optional)</Label>
                  <Select
                    value={keyId ?? "none"}
                    onValueChange={(value) => {
                      setKeyId(value === "none" ? null : (value as MixChartKeyId));
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="None — Chart by Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None — Chart by Size</SelectItem>
                      {columns.map((col, idx) => (
                        <SelectItem
                          key={idx}
                          value={col.isWater ? "water" : col.label}
                        >
                          {col.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Unit Type Selector — only when key column is selected */}
              {hasKeySelected && keyColumn && (
                <div className="flex flex-col gap-2">
                  <Label>Unit Type</Label>
                  <RadioGroup
                    variant="button-group"
                    value={unitContext}
                    onValueChange={(value) => setUnitContext(value as UnitContext)}
                  >
                    <RadioGroupItem value="load">
                      {keyColumn.unitConfigDisplay.getUnitLabel("load")}
                    </RadioGroupItem>
                    <RadioGroupItem value="app">
                      {keyColumn.unitConfigDisplay.getUnitLabel("app")}
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
                  className="w-28"
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
                  className="w-28"
                  min={1}
                  max={100}
                />
              </div>
            </div>

            {/* PDF Viewer — fills remaining height in the right column */}
            {hasColumns ? (
              <div className="flex-1 min-h-0 w-full">
                <PDFViewer style={{ width: "100%", height: "100%" }}>
                  {hasKeySelected && keyColumn ? (
                    <MixChartByProductAmountPDF
                      title={chartTitle}
                      keyColumn={keyColumn}
                      otherColumns={otherColumns}
                      chartData={chartDataByProductAmount}
                    />
                  ) : (
                    <MixChartPDF
                      title={chartTitle}
                      columns={columns}
                      chartData={chartDataBySize}
                    />
                  )}
                </PDFViewer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border text-muted-foreground text-sm">
                Add equipment and products to generate a chart.
              </div>
            )}
          </div>
        </div>
      </div>

      <ProductsFooter />
    </Container>
  );
}
