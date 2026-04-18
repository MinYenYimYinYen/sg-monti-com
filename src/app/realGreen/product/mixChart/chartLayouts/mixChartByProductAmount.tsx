import { Document, Page, View, Text } from "@react-pdf/renderer";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import {
  MixChartByProductAmountRow,
  MixChartConstituentKey,
  MixChartEquipmentGroup,
} from "@/app/realGreen/product/mixChart/_lib/mixChartUtils";
import { tw } from "@/lib/pdf/tw";
import { LandPlotPDFIcon } from "@/lib/pdf/pdfIcons";
import { PDFNumber } from "@/components/Number";

const KEY_PRODUCT_COLUMN_WIDTH = "w-32";

export type MixChartByProductAmountPDFProps = {
  master: ProductMaster;
  selectedKey: MixChartConstituentKey;
  chartData: MixChartByProductAmountRow[];
  groups: MixChartEquipmentGroup[] | null;
};

export function MixChartByProductAmountPDF({
  master,
  selectedKey,
  chartData,
  groups,
}: MixChartByProductAmountPDFProps) {
  const hasGroups = groups !== null && groups.length > 0;

  if (chartData.length === 0) {
    return (
      <Document>
        <Page size={"LETTER"} style={tw("p-4 text-xs")}>
          <Text>No data available</Text>
        </Page>
      </Document>
    );
  }

  // Resolve the key constituent label and rate for the header
  let keyLabel = "";
  let keyRateDisplay = "";
  let keyAppUnit = "";

  if (hasGroups) {
    for (const group of groups!) {
      for (const constituent of group.constituents) {
        if (
          selectedKey.type === "water" &&
          constituent.isWater &&
          group.equipment.equipmentId === selectedKey.equipmentId
        ) {
          keyLabel = constituent.label;
          keyRateDisplay = constituent.ratePerKsf.toFixed(2);
          keyAppUnit = constituent.unitConfigDisplay.getUnitLabel("app");
          break;
        }
        if (
          selectedKey.type === "solute" &&
          !constituent.isWater &&
          constituent.subProductConfig?.subId === selectedKey.subId
        ) {
          keyLabel = constituent.label;
          keyRateDisplay = (constituent.subProductConfig?.rate ?? 0).toFixed(2);
          keyAppUnit = constituent.unitConfigDisplay.getUnitLabel("app");
          break;
        }
      }
      if (keyLabel) break;
    }
  } else {
    // Fallback: find from subProductConfigs
    if (selectedKey.type === "solute") {
      const config = master.subProductConfigs.find((c) => c.subId === selectedKey.subId);
      if (config) {
        keyLabel = config.subProduct.description;
        keyRateDisplay = config.rate.toFixed(2);
        keyAppUnit = config.subProduct.unitConfig.conversions.app.unitLabel;
      }
    }
  }

  return (
    <Document>
      <Page size={"LETTER"} style={tw("p-4 text-xs")}>
        {/* Header */}
        <View style={tw("mb-4")}>
          <Text style={tw("text-lg font-bold")}>
            {master.productCode} - {master.description}
          </Text>
          <Text style={tw("text-sm mt-1")}>
            Keyed on: {keyLabel} ({chartData[0]?.unit})
          </Text>
        </View>

        {/* Table */}
        <View style={tw("border border-black")}>
          {hasGroups ? (
            <>
              {/* Equipment group header row */}
              <View style={tw("flex flex-row border-b border-black bg-[#d0d0d0]")}>
                {/* Key product column placeholder */}
                <View style={tw(`${KEY_PRODUCT_COLUMN_WIDTH} border-r border-black p-1`)} />
                {/* Size column placeholder */}
                <View style={tw("w-16 border-r border-black p-1")} />
                {groups!.map((group) => {
                  // Count "other" constituents for this group (excluding the key)
                  const otherCount = group.constituents.filter((constituent) => {
                    if (
                      selectedKey.type === "water" &&
                      constituent.isWater &&
                      group.equipment.equipmentId === selectedKey.equipmentId
                    ) {
                      return false;
                    }
                    if (
                      selectedKey.type === "solute" &&
                      !constituent.isWater &&
                      constituent.subProductConfig?.subId === selectedKey.subId
                    ) {
                      return false;
                    }
                    return true;
                  }).length;

                  if (otherCount === 0) return null;

                  return (
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
                  );
                })}
              </View>

              {/* Constituent header row */}
              <View style={tw("flex flex-row border-b-2 border-black bg-[#f5f5f5]")}>
                {/* Key product column */}
                <View
                  style={tw(
                    `${KEY_PRODUCT_COLUMN_WIDTH} border-r border-black p-2 flex items-center justify-center`,
                  )}
                >
                  <View style={tw("flex flex-col items-center")}>
                    <Text style={tw("font-bold text-center")}>{keyLabel}</Text>
                    <Text style={tw("text-[9px] text-center")}>
                      ({keyRateDisplay} {keyAppUnit}/1000)
                    </Text>
                  </View>
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

                {/* Other constituent columns per equipment group */}
                {groups!.map((group) =>
                  group.constituents
                    .filter((constituent) => {
                      if (
                        selectedKey.type === "water" &&
                        constituent.isWater &&
                        group.equipment.equipmentId === selectedKey.equipmentId
                      ) {
                        return false;
                      }
                      if (
                        selectedKey.type === "solute" &&
                        !constituent.isWater &&
                        constituent.subProductConfig?.subId === selectedKey.subId
                      ) {
                        return false;
                      }
                      return true;
                    })
                    .map((constituent, idx) => (
                      <View
                        key={`${group.equipment.equipmentId}-${idx}`}
                        style={tw(
                          "flex-1 border-r border-black p-1 flex items-center justify-center",
                        )}
                      >
                        {constituent.isWater ? (
                          <Text style={tw("font-bold text-center")}>Water</Text>
                        ) : (
                          <Text style={tw("font-bold text-center")}>
                            {constituent.label}
                          </Text>
                        )}
                      </View>
                    )),
                )}
              </View>

              {/* Data rows */}
              {chartData.map((row, index) => (
                <View
                  key={index}
                  style={tw(
                    `flex flex-row border-b border-black ${index % 2 === 0 ? "bg-[#e5e5e5]" : ""}`,
                  )}
                >
                  {/* Key product amount */}
                  <View
                    style={tw(
                      `${KEY_PRODUCT_COLUMN_WIDTH} border-r border-black p-2 flex items-center justify-center`,
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

                  {/* Other constituent amounts per equipment group */}
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
              {(() => {
                const selectedSubId = selectedKey.type === "solute" ? selectedKey.subId : null;
                const selectedConfig = selectedSubId !== null
                  ? master.subProductConfigs.find((c) => c.subId === selectedSubId)
                  : null;
                const otherConfigs = selectedConfig && selectedSubId !== null
                  ? master.subProductConfigs.filter((c) => c.subId !== selectedSubId)
                  : master.subProductConfigs;

                return (
                  <>
                    <View style={tw("flex flex-row border-b-2 border-black bg-[#f5f5f5]")}>
                      <View
                        style={tw(
                          `${KEY_PRODUCT_COLUMN_WIDTH} border-r border-black p-2 flex items-center justify-center`,
                        )}
                      >
                        <View style={tw("flex flex-row gap-1 items-center")}>
                          <Text style={tw("font-bold")}>
                            {selectedConfig?.subProduct.description ?? keyLabel} (
                          </Text>
                          <PDFNumber decimals={2} style={tw("font-bold")}>
                            {selectedConfig?.rate ?? 0}
                          </PDFNumber>
                          <Text style={tw("font-bold")}>
                            {selectedConfig?.subProduct.unitConfig.conversions.app.unitLabel ?? keyAppUnit}/1000)
                          </Text>
                        </View>
                      </View>

                      <View
                        style={tw(
                          "w-16 border-r border-black p-2 flex flex-row gap-1 items-center justify-center",
                        )}
                      >
                        <LandPlotPDFIcon size={12} />
                        <Text style={tw("font-bold")}>Size</Text>
                      </View>

                      {otherConfigs.map((config) => (
                        <View
                          key={config.subId}
                          style={tw(
                            "flex-1 border-r border-black p-2 flex items-center justify-center",
                          )}
                        >
                          <Text style={tw("font-bold")}>
                            {config.subProduct.description}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {chartData.map((row, index) => (
                      <View
                        key={index}
                        style={tw(
                          `flex flex-row border-b border-black ${index % 2 === 0 ? "bg-[#e5e5e5]" : ""}`,
                        )}
                      >
                        <View
                          style={tw(
                            `${KEY_PRODUCT_COLUMN_WIDTH} border-r border-black p-2 flex items-center justify-center`,
                          )}
                        >
                          <View style={tw("flex flex-row gap-1 items-center")}>
                            <PDFNumber>{row.amount}</PDFNumber>
                            <Text style={tw("text-[10px]")}>{row.unit}</Text>
                          </View>
                        </View>

                        <View
                          style={tw(
                            "w-16 border-r border-black p-2 flex items-center justify-center",
                          )}
                        >
                          <PDFNumber>{row.sizeCovered}</PDFNumber>
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
                );
              })()}
            </>
          )}
        </View>
      </Page>
    </Document>
  );
}
