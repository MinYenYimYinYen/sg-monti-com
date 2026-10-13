import { View, Text } from "@react-pdf/renderer";
import { PDFNumber } from "@/lib/pdf/_components/PDFNumber";
import type { LabelValuePair } from "@/lib/pdf/_components/LabelValueList";

type PrepayLabelValueListProps = {
  pairs: LabelValuePair[];
  fontSize?: number;
};

/**
 * Feature-local PDF component for prepay letter program/total lists.
 * Renders three columns: label (flex-1), annotation (fixed, centered), value (right-aligned).
 * The annotation column (e.g. "10% off") is only rendered when at least one pair has one.
 */
export function PrepayLabelValueList({ pairs, fontSize = 10 }: PrepayLabelValueListProps) {
  const hasAnnotations = pairs.some((p) => p.annotation != null);

  return (
    <View style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {pairs.map((pair, index) => (
        <View
          key={index}
          style={{ display: "flex", flexDirection: "row", width: "100%" }}
        >
          {/* Label — takes all remaining space */}
          <Text style={{ flex: 1, fontSize }}>{pair.label}</Text>

          {/* Annotation column — only rendered when any pair has an annotation */}
          {hasAnnotations && (
            <Text
              style={{
                fontSize,
                width: 48,
                textAlign: "center",
                color: "#555555",
              }}
            >
              {pair.annotation ?? ""}
            </Text>
          )}

          {/* Value — right-aligned, uses only the space it needs */}
          {pair.isMoney || typeof pair.value === "number" ? (
            <PDFNumber
              isMoney={pair.isMoney}
              decimals={pair.decimals}
              style={{ fontSize, textAlign: "right" }}
            >
              {pair.value as number}
            </PDFNumber>
          ) : (
            <Text style={{ fontSize, textAlign: "right" }}>
              {pair.value ?? ""}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
