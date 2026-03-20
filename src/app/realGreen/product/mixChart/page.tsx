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
import { Button } from "@/style/components/button";
import { Badge } from "@/style/components/badge";
import { Sheet, SheetContent } from "@/style/components/sheet";
import {
  generateMixChartData,
  generateMixChartByProductAmount,
} from "@/app/realGreen/product/mixChart/_lib/mixChartUtils";
import { MixChartPDF } from "./chartLayouts/mixChartBySize";
import { MixChartByProductAmountPDF } from "./chartLayouts/mixChartByProductAmount";
import { UnitContext } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { FooterPortal } from "@/components/FooterPortal";
import { ProductsFooter } from "@/app/realGreen/product/list/tabs/components/ProductsFooter";
import { CustomAppMethodEditor } from "./components/CustomAppMethodEditor";
import { Pencil, X } from "lucide-react";

export default function MixChartPage() {
  useProduct({ autoLoad: true });
  const isClient = useIsClient();
  const masters = useSelector(productSelect.productMasters);

  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [unitContext, setUnitContext] = useState<UnitContext>("load");
  const [increment, setIncrement] = useState<number>(10);
  const [rowCount, setRowCount] = useState<number>(17);
  const [customRates, setCustomRates] = useState<Map<number, number>>(new Map());
  const [editingSubId, setEditingSubId] = useState<number | null>(null);

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

  // Generate chart data based on layout type (uses debounced values and custom rates)
  const chartDataBySize = selectedMaster
    ? generateMixChartData(selectedMaster, debouncedIncrement, maxSize, customRates)
    : [];

  const chartDataByProductAmount =
    selectedMaster && selectedSubId
      ? generateMixChartByProductAmount(selectedMaster, selectedSubId, debouncedIncrement, maxUnits, unitContext, customRates)
      : [];

  const editingConfig = selectedMaster && editingSubId
    ? selectedMaster.subProductConfigs.find(c => c.subId === editingSubId)
    : null;

  if (!isClient) return null;

  return (
    <Container variant={"page"}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Mix Chart</h1>

        {/* Custom Rates Display */}
        {customRates.size > 0 && selectedMaster && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Custom Rates:</span>
            {Array.from(customRates.entries()).map(([subId, rate]) => {
              const config = selectedMaster.subProductConfigs.find(c => c.subId === subId);
              if (!config) return null;
              return (
                <Badge key={subId} variant="secondary" className="flex items-center gap-1">
                  {config.subProduct.description}: {rate.toFixed(2)}
                  <button
                    onClick={() => {
                      const newRates = new Map(customRates);
                      newRates.delete(subId);
                      setCustomRates(newRates);
                    }}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        {/* Controls Row */}
        <div className="flex gap-4 items-end flex-wrap">
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

            {/* UnitCRM Context Selector - only shown when Key Product selected */}
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

        {/* Customize Rates Section */}
        {selectedMaster && selectedMaster.subProductConfigs.some(c => c.useAppMethod) && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Customize Rates</Label>
            <div className="flex flex-wrap gap-2">
              {selectedMaster.subProductConfigs
                .filter(c => c.useAppMethod)
                .map((config) => (
                  <Button
                    key={config.subId}
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSubId(config.subId)}
                    className="flex items-center gap-2"
                  >
                    <Pencil className="h-3 w-3" />
                    {config.subProduct.description}
                    {customRates.has(config.subId) && (
                      <Badge variant="default" className="ml-1 h-4 text-xs">Custom</Badge>
                    )}
                  </Button>
                ))}
            </div>
          </div>
        )}

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

      {/* Custom Rate Editor Sheet */}
      {editingConfig && (
        <Sheet open={!!editingSubId} onOpenChange={() => setEditingSubId(null)}>
          <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
            <CustomAppMethodEditor
              config={editingConfig}
              onRateCalculated={(subId, rate) => {
                setCustomRates(prev => new Map(prev).set(subId, rate));
                setEditingSubId(null);
              }}
              onCancel={() => setEditingSubId(null)}
            />
          </SheetContent>
        </Sheet>
      )}

      <ProductsFooter />
    </Container>
  );
}
