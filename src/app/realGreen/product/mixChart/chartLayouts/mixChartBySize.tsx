import { Document, Page, View, Text } from "@react-pdf/renderer";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { MixChartRow } from "@/app/realGreen/product/_lib/utils/mixChartUtils";
import { tw } from "@/lib/pdf/tw";
import { LandPlotPDFIcon } from "@/lib/pdf/pdfIcons";
import { PDFNumber } from "@/components/Number";

export type MixChartPDFProps = {
  master: ProductMaster;
  chartData: MixChartRow[];
};

export function MixChartPDF({ master, chartData }: MixChartPDFProps) {
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
                  {config.subProduct.description} ({config.rate}{config.subProduct.unitConfig.conversions.app.unitLabel}/1000)
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
                      <PDFNumber>
                        {part.amount}
                      </PDFNumber>
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
