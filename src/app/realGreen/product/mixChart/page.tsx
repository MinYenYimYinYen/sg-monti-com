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
  generateMixChartData,
  generateMixChartByProductAmount,
} from "@/app/realGreen/product/_lib/utils/mixChartUtils";
import { MixChartPDF } from "./chartLayouts/mixChartBySize";
import { MixChartByProductAmountPDF } from "./chartLayouts/mixChartByProductAmount";
import { UnitContext } from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";

export default function MixChartPage() {
  useProduct({ autoLoad: true });
  const isClient = useIsClient();
  const masters = useSelector(productSelect.productMasters);

  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [unitContext, setUnitContext] = useState<UnitContext>("load");
  const [increment, setIncrement] = useState<number>(10);
  const [rowCount, setRowCount] = useState<number>(17);

  // Debounce increment and row count to avoid re-rendering PDF on every keystroke
  const debouncedIncrement = useDebounce(increment, 100);
  const debouncedRowCount = useDebounce(rowCount, 100);

  const selectedMaster = masters.find((m) => m.productId === selectedMasterId);
  const selectedSubConfig = selectedMaster?.subProductConfigs.find(
    (config) => config.subId === selectedSubId
  );

  // Calculate max values based on debounced increment and row count
  const maxSize = debouncedIncrement * debouncedRowCount;
  const maxUnits = debouncedIncrement * debouncedRowCount;

  // Generate chart data based on layout type (uses debounced values)
  const chartDataBySize = selectedMaster
    ? generateMixChartData(selectedMaster, debouncedIncrement, maxSize)
    : [];

  const chartDataByProductAmount =
    selectedMaster && selectedSubId
      ? generateMixChartByProductAmount(selectedMaster, selectedSubId, debouncedIncrement, maxUnits, unitContext)
      : [];

  if (!isClient) return null;

  return (
    <Container variant={"page"}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Mix Chart</h1>

        {/* Controls Row */}
        <div className="flex gap-4 items-end">
            <div className="flex flex-col gap-2">
              <Label>Master Product</Label>
              <Select
                value={selectedMasterId?.toString() || ""}
                onValueChange={(value) => setSelectedMasterId(Number(value))}
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

            {/* Sub Product Selector - optional */}
            {selectedMaster && (
              <div className="flex flex-col gap-2">
                <Label>Key Product (Optional)</Label>
                <Select
                  value={selectedSubId?.toString() || "none"}
                  onValueChange={(value) =>
                    setSelectedSubId(value === "none" ? null : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None - Chart by Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - Chart by Size</SelectItem>
                    {selectedMaster.subProductConfigs.map((config) => (
                      <SelectItem
                        key={config.subId}
                        value={config.subId.toString()}
                      >
                        {config.subProduct.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Unit Context Selector - only shown when Key Product selected */}
            {selectedSubConfig && (
              <div className="flex flex-col gap-2">
                <Label>Unit Type</Label>
                <RadioGroup
                  variant="button-group"
                  value={unitContext}
                  onValueChange={(value) => setUnitContext(value as UnitContext)}
                >
                  <RadioGroupItem value="load">
                    {selectedSubConfig.subProduct.unitConfig.conversions.load.unitLabel}
                  </RadioGroupItem>
                  <RadioGroupItem value="app">
                    {selectedSubConfig.subProduct.unitConfig.conversions.app.unitLabel}
                  </RadioGroupItem>
                </RadioGroup>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>
                {selectedSubId ? "Increment" : "Size Increment"}
              </Label>
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
              {selectedSubId ? (
                <MixChartByProductAmountPDF
                  master={selectedMaster}
                  selectedSubId={selectedSubId}
                  chartData={chartDataByProductAmount}
                />
              ) : (
                <MixChartPDF
                  master={selectedMaster}
                  chartData={chartDataBySize}
                />
              )}
            </PDFViewer>
          </div>
        )}
      </div>
    </Container>
  );
}
