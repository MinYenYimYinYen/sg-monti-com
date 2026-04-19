import { Document, Page, View, Text } from "@react-pdf/renderer";
import {
  MixChartByProductAmountRow,
  MixChartColumn,
} from "@/app/realGreen/product/mixChart/_lib/mixChartUtils";
import { tw } from "@/lib/pdf/tw";
import { LandPlotPDFIcon } from "@/lib/pdf/pdfIcons";
import { PDFNumber } from "@/components/Number";

const KEY_COLUMN_WIDTH = "w-32";

export type MixChartByProductAmountPDFProps = {
  title: string;
  keyColumn: MixChartColumn;
  otherColumns: MixChartColumn[];
  chartData: MixChartByProductAmountRow[];
};

export function MixChartByProductAmountPDF({
  title,
  keyColumn,
  otherColumns,
  chartData,
}: MixChartByProductAmountPDFProps) {
  if (chartData.length === 0) {
    return (
      <Document>
        <Page size={"LETTER"} style={tw("p-4 text-xs")}>
          <Text>No data available</Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size={"LETTER"} style={tw("p-4 text-xs")}>
        {/* Header */}
        <View style={tw("mb-4")}>
          <Text style={tw("text-lg font-bold")}>{title}</Text>
          <Text style={tw("text-sm mt-1")}>
            Keyed on: {keyColumn.label} ({chartData[0]?.unit})
          </Text>
        </View>

        {/* Table */}
        <View style={tw("border border-black")}>
          {/* Header row */}
          <View style={tw("flex flex-row border-b-2 border-black bg-[#f5f5f5]")}>
            {/* Key column */}
            <View
              style={tw(
                `${KEY_COLUMN_WIDTH} border-r border-black p-2 flex flex-col items-center justify-center`,
              )}
            >
              <Text style={tw("font-bold text-center")}>{keyColumn.label}</Text>
              {!keyColumn.isWater && (
                <View style={tw("flex flex-row gap-1 items-center")}>
                  <Text style={tw("text-[9px]")}>(</Text>
                  <PDFNumber decimals={2} style={tw("text-[9px]")}>
                    {keyColumn.ratePerKsf}
                  </PDFNumber>
                  <Text style={tw("text-[9px]")}>
                    {keyColumn.unitConfigDisplay.getUnitLabel("app")}/1000)
                  </Text>
                </View>
              )}
            </View>

            {/* Size covered column */}
            <View
              style={tw(
                "w-16 border-r border-black p-2 flex flex-row gap-1 items-center justify-center",
              )}
            >
              <LandPlotPDFIcon size={12} />
              <Text style={tw("font-bold")}>Size</Text>
            </View>

            {/* Other columns */}
            {otherColumns.map((col, idx) => (
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
              key={index}
              style={tw(
                `flex flex-row border-b border-black ${index % 2 === 0 ? "bg-[#e5e5e5]" : ""}`,
              )}
            >
              {/* Key amount */}
              <View
                style={tw(
                  `${KEY_COLUMN_WIDTH} border-r border-black p-2 flex items-center justify-center`,
                )}
              >
                <View style={tw("flex flex-row gap-1 items-center")}>
                  <PDFNumber>{row.amount}</PDFNumber>
                  <Text style={tw("text-[10px]")}>{row.unit}</Text>
                </View>
              </View>

              {/* Size covered */}
              <View
                style={tw(
                  "w-16 border-r border-black p-2 flex items-center justify-center",
                )}
              >
                <PDFNumber>{row.sizeCovered}</PDFNumber>
              </View>

              {/* Other amounts */}
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
