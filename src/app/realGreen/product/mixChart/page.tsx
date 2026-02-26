"use client";
import { useState } from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { Container } from "@/components/Containers";
import { Document, Page, PDFViewer, View, Text } from "@react-pdf/renderer";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { tw } from "@/lib/pdf/tw";
import { LandPlotPDFIcon } from "@/lib/pdf/pdfIcons";
import { PDFNumber } from "@/components/Number";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import {
  generateMixChartData,
  MixChartRow,
} from "@/app/realGreen/product/_lib/utils/mixChartUtils";

export default function MixChartPage() {
  useProduct({ autoLoad: true });
  const isClient = useIsClient();
  const masters = useSelector(productSelect.productMasters);

  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
  const [increment, setIncrement] = useState<number>(5);

  const selectedMaster = masters.find((m) => m.productId === selectedMasterId);
  const chartData = selectedMaster
    ? generateMixChartData(selectedMaster, increment, 170)
    : [];

  if (!isClient) return null;

  return (
    <Container variant={"page"}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Mix Chart</h1>

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

          <div className="flex flex-col gap-2">
            <Label>Size Increment</Label>
            <Input
              type="number"
              value={increment}
              onChange={(e) => setIncrement(Number(e.target.value) || 1)}
              className="w-32"
              min={1}
              max={50}
            />
          </div>
        </div>

        {selectedMaster && (
          <div className={"w-full h-[75vh] overflow-y-auto"}>
            <PDFViewer style={{ width: "100%", height: "100%" }}>
              <MixChartPDF master={selectedMaster} chartData={chartData} />
            </PDFViewer>
          </div>
        )}
      </div>
    </Container>
  );
}

type MixChartPDFProps = {
  master: ProductMaster;
  chartData: MixChartRow[];
};

function MixChartPDF({ master, chartData }: MixChartPDFProps) {
  return (
    <Document>
      <Page size={"LETTER"} style={tw("p-4 text-xs")}>
        {/* Header */}
        <View style={tw("mb-4")}>
          <Text style={tw("text-lg font-bold")}>
            {master.productCode} - {master.description}
          </Text>
        </View>

        {/* Table */}
        <View style={tw("border border-black")}>
          {/* Header Row */}
          <View
            style={tw("flex flex-row border-b-2 border-black bg-[#f5f5f5]")}
          >
            <View
              style={tw(
                `w-14 border-r border-black p-2 flex flex-row gap-1 items-center justify-center`,
              )}
            >
              <LandPlotPDFIcon size={12} />
              <Text>Size</Text>
            </View>
            {master.subProductConfigs.map((config) => (
              <View
                key={config.subId}
                style={tw(
                  "flex-1 border-r border-black p-2 flex flex-row gap-2 items-center justify-center",
                )}
              >
                <Text style={tw("font-bold")}>
                  {config.subProduct.description}
                </Text>
                <Text style={tw("text-[10px]")}>
                  ({config.subProduct.unit.desc})
                </Text>
              </View>
            ))}
          </View>

          {/* Data Rows */}
          {chartData.map((row, index) => (
            <View
              key={row.size}
              style={tw(
                `flex flex-row border-b border-black ${index % 2 === 0 ? "bg-[#e5e5e5]" : ""}`,
              )}
            >
              <View
                style={tw(
                  "w-14 border-r border-black p-2 flex items-center justify-center",
                )}
              >
                <Text>{row.size}</Text>
              </View>
              {row.amounts.map((amount, idx) => (
                <View
                  key={idx}
                  style={tw(
                    "flex-1 border-r border-black p-2 flex flex-row gap-1 items-center justify-center",
                  )}
                >
                  <PDFNumber>{amount}</PDFNumber>
                </View>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
