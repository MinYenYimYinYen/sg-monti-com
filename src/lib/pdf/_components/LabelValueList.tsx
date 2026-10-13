import { View, Text } from "@react-pdf/renderer";
import { PDFNumber } from "@/lib/pdf/_components/PDFNumber";

export type LabelValuePair = {
  label: string;
  value: string | number | null;
  isMoney?: boolean;
  decimals?: number;
  /** Optional annotation displayed between the label and value (e.g. "10% off"). */
  annotation?: string;
};

type LabelValueListProps = {
  pairs: LabelValuePair[];
  fontSize?: number;
};

/**
 * Renders a list of label/value pairs in two columns.
 * The label takes all available space; the value right-aligns using only the space it needs.
 * If a pair has an `annotation`, it is rendered between the label and value.
 */
export function LabelValueList({ pairs, fontSize = 10 }: LabelValueListProps) {
  return (
    <View style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {pairs.map((pair, index) => (
        <View
          key={index}
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
          }}
        >
          <Text style={{ flex: 1, fontSize }}>{pair.label}</Text>
          {pair.annotation != null && (
            <Text style={{ fontSize, textAlign: "center", marginHorizontal: 4 }}>
              {pair.annotation}
            </Text>
          )}
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
