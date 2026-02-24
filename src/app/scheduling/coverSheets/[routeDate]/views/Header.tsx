import { View, Text } from "@react-pdf/renderer";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { HashPDFIcon, LandPlotPDFIcon } from "@/lib/pdf/pdfIcons";
import { PDFNumber } from "@/components/Number";
import { headerStyles } from "./headerStyle";

type HeaderProps = {
  routeDate: string;
  employeeId: string;
  employeeName: string;
  servCodeCounts: {
    servCodeId: string;
    count: number;
    size: number;
    price: number;
  }[];
};

const hs = headerStyles;

export function Header({ routeDate, employeeId, employeeName, servCodeCounts }: HeaderProps) {
  return (
    <View style={hs.header}>
      <Text>{prettyDate(routeDate, "EEE, MMM d")}</Text>
      <Text>
        {employeeId} - {employeeName}
      </Text>
      <View>
        {servCodeCounts.map((servCodeCount) => {
          const { servCodeId, count, size, price } = servCodeCount;
          return (
            <View key={servCodeId} style={hs.servCode}>
              <Text style={{ textAlign: "right" }}>{servCodeId}</Text>
              <View style={hs.servCodeValue}>
                <HashPDFIcon size={10} />
                <PDFNumber>{count}</PDFNumber>
              </View>
              <View style={hs.servCodeValue}>
                <LandPlotPDFIcon size={10} />
                <PDFNumber>{size}</PDFNumber>
              </View>
              <View style={hs.servCodeValue}>
                <PDFNumber isMoney={true}>{price}</PDFNumber>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
