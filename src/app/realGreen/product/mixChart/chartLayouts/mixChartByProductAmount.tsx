import { Document, Page, View, Text } from "@react-pdf/renderer";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { MixChartByProductAmountRow } from "@/app/realGreen/product/_lib/utils/mixChartUtils";
import { tw } from "@/lib/pdf/tw";
import { LandPlotPDFIcon } from "@/lib/pdf/pdfIcons";
import { PDFNumber } from "@/components/Number";

const KEY_PRODUCT_COLUMN_WIDTH = "w-32";

export type MixChartByProductAmountPDFProps = {
  master: ProductMaster;
  selectedSubId: number;
  chartData: MixChartByProductAmountRow[];
};

export function MixChartByProductAmountPDF({
  master,
  selectedSubId,
  chartData,
}: MixChartByProductAmountPDFProps) {
  const selectedConfig = master.subProductConfigs.find(
    (config) => config.subId === selectedSubId
  );

  if (!selectedConfig || chartData.length === 0) {
    return (
      <Document>
        <Page size={"LETTER"} style={tw("p-4 text-xs")}>
          <Text>No data available</Text>
        </Page>
      </Document>
    );
  }

  const otherConfigs = master.subProductConfigs.filter(
    (config) => config.subId !== selectedSubId
  );

  return (
    <Document>
      <Page size={"LETTER"} style={tw("p-4 text-xs")}>
        {/* Header */}
        <View style={tw("mb-4")}>
          <Text style={tw("text-lg font-bold")}>
            {master.productCode} - {master.description}
          </Text>
          <Text style={tw("text-sm mt-1")}>
            Keyed on: {selectedConfig.subProduct.description} (
            {chartData[0]?.unit})
          </Text>
        </View>

        {/* Table */}
        <View style={tw("border border-black")}>
          {/* Header Row */}
          <View
            style={tw("flex flex-row border-b-2 border-black bg-[#f5f5f5]")}
          >
            {/* Load Amount Column */}
            <View
              style={tw(
                `${KEY_PRODUCT_COLUMN_WIDTH} border-r border-black p-2 flex items-center justify-center`
              )}
            >
              <Text style={tw("font-bold")}>
                {selectedConfig.subProduct.description} ({selectedConfig.rate}{selectedConfig.subProduct.unitConfig.conversions.app.unitLabel}/1000)
              </Text>
            </View>

            {/* Size Covered Column */}
            <View
              style={tw(
                "w-16 border-r border-black p-2 flex flex-row gap-1 items-center justify-center"
              )}
            >
              <LandPlotPDFIcon size={12} />
              <Text style={tw("font-bold")}>Size</Text>
            </View>

            {/* Other Sub-Products Columns */}
            {otherConfigs.map((config) => (
              <View
                key={config.subId}
                style={tw(
                  "flex-1 border-r border-black p-2 flex items-center justify-center"
                )}
              >
                <Text style={tw("font-bold")}>
                  {config.subProduct.description}
                </Text>
              </View>
            ))}
          </View>

          {/* Data Rows */}
          {chartData.map((row, index) => (
            <View
              key={index}
              style={tw(
                `flex flex-row border-b border-black ${index % 2 === 0 ? "bg-[#e5e5e5]" : ""}`
              )}
            >
              {/* Amount */}
              <View
                style={tw(
                  `${KEY_PRODUCT_COLUMN_WIDTH} border-r border-black p-2 flex items-center justify-center`
                )}
              >
                <View style={tw("flex flex-row gap-1 items-center")}>
                  <PDFNumber>{row.amount}</PDFNumber>
                  <Text style={tw("text-[10px]")}>{row.unit}</Text>
                </View>
              </View>

              {/* Size Covered */}
              <View
                style={tw(
                  "w-16 border-r border-black p-2 flex items-center justify-center"
                )}
              >
                <PDFNumber>{row.sizeCovered}</PDFNumber>
              </View>

              {/* Other Sub-Product Amounts */}
              {row.amounts.map((amountData, idx) => (
                <View
                  key={idx}
                  style={tw(
                    "flex-1 border-r border-black p-2 flex flex-col items-center justify-center"
                  )}
                >
                  {amountData.parts.map((part, partIdx) => (
                    <View
                      key={partIdx}
                      style={tw(
                        "flex flex-row gap-1 items-center justify-center"
                      )}
                    >
                      <PDFNumber>{part.amount}</PDFNumber>
                      <Text
                        style={tw(part.isWhole ? "font-bold" : "text-[10px]")}
                      >
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
