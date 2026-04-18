import { Document, Page, View, Text } from "@react-pdf/renderer";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import {
  MixChartEquipmentGroup,
  MixChartRowWithGroups,
} from "@/app/realGreen/product/mixChart/_lib/mixChartUtils";
import { tw } from "@/lib/pdf/tw";
import { LandPlotPDFIcon } from "@/lib/pdf/pdfIcons";
import { PDFNumber } from "@/components/Number";

export type MixChartPDFProps = {
  master: ProductMaster;
  chartData: MixChartRowWithGroups[];
  groups: MixChartEquipmentGroup[] | null;
};

export function MixChartPDF({ master, chartData, groups }: MixChartPDFProps) {
  const hasGroups = groups !== null && groups.length > 0;

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
          {hasGroups ? (
            <>
              {/* Equipment group header row */}
              <View style={tw("flex flex-row border-b border-black bg-[#d0d0d0]")}>
                {/* Size column placeholder */}
                <View style={tw("w-14 border-r border-black p-1")} />
                {groups!.map((group) => (
                  <View
                    key={group.equipment.equipmentId}
                    style={tw(
                      `flex-1 border-r border-black p-1 flex items-center justify-center`,
                    )}
                  >
                    <Text style={tw("font-bold text-center")}>
                      {group.equipment.description}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Constituent header row */}
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
                {groups!.map((group) =>
                  group.constituents.map((constituent, idx) => (
                    <View
                      key={`${group.equipment.equipmentId}-${idx}`}
                      style={tw(
                        "flex-1 border-r border-black p-1 flex items-center justify-center",
                      )}
                    >
                      {constituent.isWater ? (
                        <Text style={tw("font-bold text-center")}>Water</Text>
                      ) : (
                        <View style={tw("flex flex-col items-center")}>
                          <Text style={tw("font-bold text-center")}>
                            {constituent.label}
                          </Text>
                          <View style={tw("flex flex-row gap-1 items-center")}>
                            <Text style={tw("text-[9px]")}>(</Text>
                            <PDFNumber decimals={2} style={tw("text-[9px]")}>
                              {constituent.subProductConfig?.rate ?? 0}
                            </PDFNumber>
                            <Text style={tw("text-[9px]")}>
                              {constituent.unitConfigDisplay.getUnitLabel("app")}/1000)
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )),
                )}
              </View>

              {/* Data rows */}
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
                  {row.equipmentGroupRows.map((groupRow) =>
                    groupRow.amounts.map((amountData, idx) => (
                      <View
                        key={`${groupRow.equipment.equipmentId}-${idx}`}
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
                    )),
                  )}
                </View>
              ))}
            </>
          ) : (
            <>
              {/* Fallback: old flat layout (no package selected) */}
              <View style={tw("flex flex-row border-b-2 border-black bg-[#f5f5f5]")}>
                <View
                  style={tw(
                    "w-14 border-r border-black p-2 flex flex-row gap-1 items-center justify-center",
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
                    <View style={tw("flex flex-row gap-1 items-center")}>
                      <Text style={tw("font-bold")}>
                        {config.subProduct.description} (
                      </Text>
                      <PDFNumber decimals={2} style={tw("font-bold")}>
                        {config.rate}
                      </PDFNumber>
                      <Text style={tw("font-bold")}>
                        {config.subProduct.unitConfig.conversions.app.unitLabel}/1000)
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

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
            </>
          )}
        </View>
      </Page>
    </Document>
  );
}
