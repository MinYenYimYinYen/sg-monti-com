import { Text } from "@react-pdf/renderer";
import { BaseNumberProps, formatNumber } from "@/components/Number";

export function PDFNumber({
  children,
  isMoney = false,
  decimals = 0,
  locale = "en-US",
  useGrouping = true,
  signDisplay = "auto",
  style,
}: PDFNumberProps) {
  const formatted = formatNumber({
    children,
    isMoney,
    decimals,
    locale,
    useGrouping,
    signDisplay,
  });

  return <Text style={style}>{formatted}</Text>;
}

type PDFNumberProps = BaseNumberProps & {
  style?: any | any[];
};