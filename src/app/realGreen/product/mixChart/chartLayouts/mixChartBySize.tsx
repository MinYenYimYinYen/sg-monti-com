import { Document, Page, View, Text } from "@react-pdf/renderer";
import { MixChartColumn, MixChartRow } from "@/app/realGreen/product/mixChart/_lib/mixChartUtils";
import { tw } from "@/lib/pdf/tw";
import { LandPlotPDFIcon } from "@/lib/pdf/pdfIcons";
import { PDFNumber } from "@/components/Number";

export type MixChartPDFProps = {
  title: string;
  columns: MixChartColumn[];
  chartData: MixChartRow[];
};

export function MixChartPDF({ title, columns, chartData }: MixChartPDFProps) {
  return (
    <Document>
      <Page size={"LETTER"} style={tw("p-4 text-xs")}>
        {/* Header */}
        <View style={tw("mb-4")}>
          <Text style={tw("text-lg font-bold")}>{title}</Text>
        </View>

        {/* Table */}
        <View style={tw("border border-black")}>
          {/* Header row */}
          <View style={tw("flex flex-row border-b-2 border-black bg-[#f5f5f5]")}>
            {/* Size column */}
            <View
              style={tw(
                "w-14 border-r border-black p-2 flex flex-row gap-1 items-center justify-center",
              )}
            >
              <LandPlotPDFIcon size={12} />
              <Text>Size</Text>
            </View>

            {/* Product columns */}
            {columns.map((col, idx) => (
              <View
                key={idx}
                style={tw(
                  "flex-1 border-r border-black p-2 flex flex-col items-center justify-center",
                )}
              >
                <Text style={tw("font-bold text-center")}>{col.label}</Text>
                {!col.isWater && (
                  <View style={tw("flex flex-row gap-1 items-center")}>
                    <Text style={tw("text-[9px]")}>(</Text>
                    <PDFNumber decimals={2} style={tw("text-[9px]")}>
                      {col.ratePerKsf}
                    </PDFNumber>
                    <Text style={tw("text-[9px]")}>
                      {col.unitConfigDisplay.getUnitLabel("app")}/1000)
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Data rows */}
          {chartData.map((row, index) => (
            <View
              key={row.size}
              style={tw(
                `flex flex-row border-b border-black ${index % 2 === 0 ? "bg-[#e5e5e5]" : ""}`,
              )}
            >
              {/* Size cell */}
              <View
                style={tw(
                  "w-14 border-r border-black p-2 flex items-center justify-center",
                )}
              >
                <Text>{row.size}</Text>
              </View>

              {/* Amount cells */}
              {row.amounts.map((amountData, idx) => (
                <View
                  key={idx}
                  style={tw(
                    "flex-1 border-r border-black p-2 flex flex-col items-center justify-center",
                  )}
                >
                  {amountData.parts.map((part, partIdx) => (
                    <View
                      key={partIdx}
                      style={tw("flex flex-row gap-1 items-center justify-center")}
                    >
                      <PDFNumber>{part.amount}</PDFNumber>
                      <Text style={tw(part.isWhole ? "font-bold" : "text-[10px]")}>
                        {part.unit}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
