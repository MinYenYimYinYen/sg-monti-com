"use client";
import { use } from "react";
import { useSelector } from "react-redux";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import { Container } from "@/components/Containers";
import { Document, Page, PDFViewer, View, Text } from "@react-pdf/renderer";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { useCoverSheets } from "@/app/scheduling/coverSheets/_lib/hooks/useCoverSheets";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { useServCodes } from "@/app/realGreen/customer/_lib/hooks/useServCodes";
import { useAppProducts } from "@/app/realGreen/customer/_lib/hooks/useAppProducts";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { tw } from "@/lib/pdf/tw";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { HashPDFIcon } from "@/lib/pdf/pdfIcons";
import { truncate } from "@/lib/primatives/string/truncate";
import { LandPlotPDFIcon } from "@/lib/pdf/pdfIcons";
import { PDFNumber } from "@/components/Number";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";

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
  const { getServCodeCounts, getServicesByRuleDesc } = useServCodes();
  const { getPlannedAppProductTotal } = useAppProducts();

  if (!isClient || !serviceByEmployee) return null;

  return (
    <Container variant={"page"}>
      <div>{routeDate}</div>
      {/*<div className={"flex gap-4"}>*/}
      {/*  <PDFDownloadLink*/}
      {/*    document={*/}
      {/*      <CoverSheetsPDF*/}
      {/*        routeDate={routeDate}*/}
      {/*        serviceByEmployee={serviceByEmployee}*/}
      {/*        getPlannedAppProductTotal={getPlannedAppProductTotal}*/}
      {/*        getServCodeCounts={getServCodeCounts}*/}
      {/*      />*/}
      {/*    }*/}
      {/*  >*/}
      {/*    Download*/}
      {/*  </PDFDownloadLink>*/}
      {/*</div>*/}
      <div className={"w-full h-[75vh] overflow-y-auto"}>
        <PDFViewer style={{ width: "100%", height: "100%" }}>
          <CoverSheetsPDF
            routeDate={routeDate}
            serviceByEmployee={serviceByEmployee}
            getPlannedAppProductTotal={getPlannedAppProductTotal}
            getServCodeCounts={getServCodeCounts}
            getServicesByRuleDesc={getServicesByRuleDesc}
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
  getServicesByRuleDesc: (services: Service[]) => {
    idWithRule: string;
    services: Service[];
  }[];
};

function CoverSheetsPDF({
  serviceByEmployee,
  routeDate,
  getServCodeCounts,
  getPlannedAppProductTotal,
  getServicesByRuleDesc,
}: CoverSheetsPDFProps) {
  return (
    <Document>
      {[...serviceByEmployee.keys()].map((employeeId) => {
        const services = serviceByEmployee.get(employeeId)!;
        const employee = services[0].lastAssigned.employee;
        const servCodesByRule = getServicesByRuleDesc(services);

        return (
          <Page
            key={employeeId}
            size={"LETTER"}
            style={tw("p-[16px] text-[12px]")}
          >
            <View
              id={"HEADER"}
              style={tw(
                "p-1 w-full border border-b-2 flex flex-row justify-between gap-2",
              )}
            >
              <View>
                <Text>{prettyDate(routeDate, "EEE, MMM d")}</Text>
                <Text>
                  {employeeId} - {employee.name}
                </Text>
              </View>
              <View id={"SERV_CODE_PRODUCTS"} style={tw("text-sm")}>
                {servCodesByRule.map((group, index) => {
                  const { idWithRule, services: groupServices } = group;
                  const { count, size, price } =
                    getServCodeCounts(groupServices)[0];
                  const split = idWithRule.split("-");
                  const servCodeId = split[0];
                  const ruleDesc = split[1] ?? "";
                  console.log("group", group);

                  const borderT = index > 0 ? " border-t" : "";

                  return (
                    <View
                      id={"SERV_CODE_PRODUCTS"}
                      key={idWithRule}
                      style={tw(
                        "flex flex-row gap-2 flex-wrap items-start" + borderT,
                      )}
                    >
                      <Text style={tw("w-[30px] border-r")}>{servCodeId}</Text>
                      <Text style={tw("w-[40px] border-r")}>{ruleDesc}</Text>
                      <View
                        style={tw("flex flex-row justify-end items-center w-7")}
                      >
                        <HashPDFIcon size={12} />
                        <PDFNumber>{count}</PDFNumber>
                      </View>
                      <View
                        style={tw(
                          "flex flex-row justify-end items-center w-10",
                        )}
                      >
                        <LandPlotPDFIcon size={12} />
                        <PDFNumber>{size}</PDFNumber>
                      </View>
                      <View
                        style={tw(
                          "flex flex-row justify-end items-center w-12",
                        )}
                      >
                        <PDFNumber isMoney={true}>{price}</PDFNumber>
                      </View>
                      <View style={tw("flex flex-col")}>
                        {getPlannedAppProductTotal(groupServices).map(
                          (totals, index) => {
                            console.log("groupServices", groupServices);
                            console.log("totals", totals);
                            return (
                              <View
                                key={index}
                                style={tw("flex flex-row gap-1")}
                              >
                                <Text style={tw("w-[80px] text-left ")}>
                                  {totals.productCommon.productCode}
                                </Text>
                                <View style={tw("w-[25px] ")}>
                                  <PDFNumber>{totals.amount}</PDFNumber>
                                </View>
                                <Text>{totals.productCommon.unit.desc}</Text>
                              </View>
                            );
                          },
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            {services.map((service) => {
              const customer = service.program.customer;
              const address = customer.address;
              const flags = customer.flags;
              const products = service.productsPlanned;

              return (
                <View
                  id={"SERVICE"}
                  key={service.servId}
                  style={tw(
                    "flex flex-row gap-2 border-b border-black pt-1 pb-1",
                  )}
                  wrap={false}
                >
                  <View
                    id={"TEMP_SEQ"}
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
                  <View id={"ADDRESS"} style={tw("flex flex-col text-sm w-48")}>
                    <Text style={tw("")}>
                      {truncate(customer.displayName, 25)}
                    </Text>
                    <Text style={tw("font-bold")}>{address.addressLine1}</Text>
                    <Text style={tw("")}>
                      {address.city}, {address.state} {address.zip}
                    </Text>
                  </View>
                  <View
                    id={"FLAGS"}
                    style={tw(
                      "flex flex-row flex-wrap items-center justify-center w-36",
                    )}
                  >
                    {flags.map((flag) => (
                      <Text
                        key={flag.flagId}
                        style={tw(
                          "text-xs border px-2 rounded-full leading-none",
                        )}
                      >
                        {flag.desc}
                      </Text>
                    ))}
                  </View>
                  <View
                    id={"SERVCODE"}
                    style={tw("flex flex-col items-center justify-center")}
                  >
                    <Text style={tw("text-lg font-bold leading-none ")}>
                      {service.servCode.servCodeId}
                    </Text>
                    <View style={tw("flex flex-row items-center")}>
                      <LandPlotPDFIcon size={12} />
                      <Text style={tw("text-lg leading-none")}>
                        {service.size}
                      </Text>
                    </View>
                    <View style={tw("text-sm")}>
                      <PDFNumber isMoney={true} decimals={2}>
                        {service.price}
                      </PDFNumber>
                    </View>
                  </View>
                  <View id={"PRODUCTS"} style={tw("flex flex-col")}></View>
                </View>
              );
            })}
          </Page>
        );
      })}
    </Document>
  );
}
