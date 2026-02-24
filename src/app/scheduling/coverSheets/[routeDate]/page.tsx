"use client";
import { use } from "react";
import { useSelector } from "react-redux";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import { Container } from "@/components/Containers";
import {
  Document,
  Page,
  PDFDownloadLink,
  PDFViewer,
  View,
  Text,
} from "@react-pdf/renderer";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { useCoverSheets } from "@/app/scheduling/coverSheets/_lib/hooks/useCoverSheets";
import { coverSheetsStyles } from "@/app/scheduling/coverSheets/[routeDate]/style";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { useServCodes } from "@/app/realGreen/customer/_lib/hooks/useServCodes";
import { useAppProducts } from "@/app/realGreen/customer/_lib/hooks/useAppProducts";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { Header } from "@/app/scheduling/coverSheets/[routeDate]/views/Header";
import { tw } from "@/lib/pdf/tw";

type RouteDatePageProps = {
  params: Promise<{
    routeDate: string;
  }>;
};

export default function RouteDatePage({ params }: RouteDatePageProps) {
  useCoverSheets();
  const isClient = useIsClient();
  const { routeDate: encodedRouteDate } = use(params);
  const routeDate = decodeURIComponent(encodedRouteDate);
  const servicesByDateAndEmployee = useSelector(
    coverSheetsSelect.servicesByDateAndEmployee,
  );
  const serviceByEmployee = servicesByDateAndEmployee.get(routeDate);
  const { getServCodeCounts } = useServCodes();
  const { getPlannedAppProductTotal } = useAppProducts();

  if (!isClient || !serviceByEmployee) return null;

  return (
    <Container variant={"page"}>
      <div>{routeDate}</div>
      <div className={"flex gap-4"}>
        <PDFDownloadLink
          document={
            <CoverSheetsPDF
              routeDate={routeDate}
              serviceByEmployee={serviceByEmployee}
              getPlannedAppProductTotal={getPlannedAppProductTotal}
              getServCodeCounts={getServCodeCounts}
            />
          }
        >
          Download
        </PDFDownloadLink>
      </div>
      <div className={"w-full h-[75vh] overflow-y-auto"}>
        <PDFViewer style={{ width: "100%", height: "100%" }}>
          <CoverSheetsPDF
            routeDate={routeDate}
            serviceByEmployee={serviceByEmployee}
            getPlannedAppProductTotal={getPlannedAppProductTotal}
            getServCodeCounts={getServCodeCounts}
          />
        </PDFViewer>
      </div>
    </Container>
  );
}

type CoverSheetsPDFProps = {
  routeDate: string;
  serviceByEmployee: Map<string, Service[]>;
  getPlannedAppProductTotal: (services: Service[]) => AppProduct[];
  getServCodeCounts: (services: Service[]) => {
    servCodeId: string;
    count: number;
    size: number;
    price: number;
  }[];
};

const cs = coverSheetsStyles;

function CoverSheetsPDF({
  serviceByEmployee,
  routeDate,
  getServCodeCounts,
  getPlannedAppProductTotal,
}: CoverSheetsPDFProps) {
  return (
    <Document>
      {[...serviceByEmployee.keys()].map((employeeId) => {
        const services = serviceByEmployee.get(employeeId)!;
        const employee = services[0].lastAssigned.employee;
        const servCodeCounts = getServCodeCounts(services);
        const plannedAppProducts = getPlannedAppProductTotal(services);

        return (
          <Page key={employeeId} size={"LETTER"} style={cs.page}>
            <Header
              routeDate={routeDate}
              employeeId={employeeId}
              employeeName={employee.name}
              servCodeCounts={servCodeCounts}
            />
            {services.map((service) => {
              const address = service.program.customer.address;
              return (
                <View
                  key={service.servId}
                  style={tw("flex flex-row gap-2 border-b border-black pt-1 pb-1")}
                >
                  <View
                    style={tw(
                      "border border-black rounded-full w-12 h-12 flex items-center justify-center",
                    )}
                  >
                    <Text
                      style={tw("text-xl font-bold text-center leading-none")}
                    >
                      {service.program.tempSeq}
                    </Text>
                  </View>
                  <View style={tw("flex flex-col text-sm")}>
                    <Text style={tw("")}>
                      {service.program.customer.custId} - {service.program.customer.displayName}
                    </Text>
                    <Text style={tw("font-bold")}>{address.addressLine1}</Text>
                    <Text style={tw("")}>{address.city}, {address.state} {address.zip}</Text>
                  </View>
                </View>
              );
            })}
          </Page>
        );
      })}
    </Document>
  );
}
