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
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { serviceConditionSelect } from "@/app/realGreen/serviceCondition/_lib/selectors/serviceConditionSelect";



type RouteDatePageProps = {
  params: Promise<{
    routeDate: string;
  }>;
};

export default function RouteDatePage({ params }: RouteDatePageProps) {
  useCoverSheets();

  const serviceConditions = useSelector(serviceConditionSelect.serviceConditionsByServId);
  console.log("serviceConditions", serviceConditions);

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

                  const borderT = index > 0 ? " border-t" : "";

                  const plannedAppProductTotal =
                    getPlannedAppProductTotal(groupServices);

                  let filtered: AppProduct[] = plannedAppProductTotal;
                  if (
                    plannedAppProductTotal
                      .map((appProduct) => appProduct.productCommon.description)
                      .includes("Water")
                  ) {
                    filtered = plannedAppProductTotal.filter(
                      (appProduct) =>
                        appProduct.productCommon.description === "Water",
                    );
                  }

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
                        {filtered.map((appProduct, index) => {
                          const loadDisplay =
                            appProduct.productCommon.unitConfigDisplay.format({
                              amount: appProduct.amount,
                              targetContexts: ["load"],
                              rounding: "ceil",
                            }).formattedString;

                          return (
                            <View key={index} style={tw("flex flex-row gap-1")}>
                              <Text style={tw("w-[80px] text-left")}>
                                {appProduct.productCommon.productCode}
                              </Text>
                              <Text>{loadDisplay}</Text>
                              {/*<View style={tw("w-[25px] ")}>*/}
                              {/*  <PDFNumber>{appProduct.amount}</PDFNumber>*/}
                              {/*</View>*/}
                              {/*<Text>{appProduct.productCommon.unit.desc}</Text>*/}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            {services.map((service) => {
              const customer = service.x.customer;
              const address = customer.address;
              const flags = customer.flags;
              const products = service.productsPlanned;
              let filtered: AppProduct[] = products;
              if (
                products
                  .map((appProduct) => appProduct.productCommon.description)
                  .includes("Water")
              ) {
                filtered = products.filter(
                  (appProduct) =>
                    appProduct.productCommon.description === "Water",
                );
              }

              // PRIORITIES
              const preNotify = typeGuard
                .definedArray([
                  service.callAhead,
                  service.program.callAhead,
                  service.program.customer.callAhead,
                ])
                .map((ca) => ca.description)
                .join(", ");
              const asap = service.asapSince && "ASAP";
              const promised = service.isPromised && "PROMISED";

              // TECH NOTES
              const servNote = service.techNote;
              const progNote = service.program.techNote;
              const custNote = service.program.customer.techNote;
              const hasNotesArray = [
                servNote.length ? 1 : 0,
                progNote.length ? 1 : 0,
                custNote.length ? 1 : 0,
              ];
              const notesCount = hasNotesArray.reduce(
                (acc, curr) => acc + curr,
                0,
              );

              const hasNotes = notesCount > 0;
              const widthCalc = (
                (1 / hasNotesArray.reduce((acc, curr) => acc + curr, 0)) *
                100
              ).toFixed(0);

              //REMAINING SERVICES
              const remainingServices = customer.x.serviceQuery.byStatus(
                "asap",
                "active",
                "printed",
              ).results;

              const remaining = remainingServices.map((service) => {
                const isPrinted = service.status === "$";
                const currentAssignedDate = isPrinted
                  ? service.lastAssigned.schedDate
                  : "";
                const currentAssignedTo = isPrinted
                  ? service.lastAssigned.employee.employeeId
                  : "";

                return {
                  servCodeId: service.servCodeId,
                  isPrinted,
                  currentAssignedDate,
                  currentAssignedTo,
                };
              });

              //HISTORY
              // history for program going back how far? appCount? Dates?
              // history for other programs for this season?
              // What to display?
              //  - servCodeId, doneDate, doneBy, conditionCodes, products used
              const historyServices =
                service.x.customer.x.serviceQuery.byDoneDate(
                  dateStrings.yearsAgo(1),
                  dateStrings.today(),
                ).results;

              const historyYear = historyServices
                .map((service) => {
                  return {
                    servCodeId: service.servCodeId,
                    doneDate: service.x.doneDate?.split("T")[0] || "",
                    doneBy: service.x
                      .doneBys!.map((db) => db.employeeId)
                      .join("/"),
                    conditions: service.x.conditions,
                    productsUsed: service.x.productsUsed,
                  };
                })
                .sort((a, b) => a.doneDate.localeCompare(b.doneDate));

              const maxHistoryRecords = 6;
              const history = historyYear.slice(-maxHistoryRecords);

              return (
                <View
                  id={"SERVICE"}
                  key={service.servId}
                  style={tw(" border-b border-black ")}
                  wrap={false}
                >
                  <View
                    id={"SPECS"}
                    style={tw("flex flex-row gap-2 pt-1 pb-1")}
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
                    <View
                      id={"ADDRESS"}
                      style={tw("flex flex-col text-sm w-48")}
                    >
                      <Text>{truncate(customer.displayName, 25)}</Text>
                      <Text style={tw("font-bold")}>
                        {address.addressLine1}
                      </Text>
                      <Text>
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
                      style={tw(
                        "flex flex-col items-center justify-center w-[50px]",
                      )}
                    >
                      <Text style={tw("text-lg font-bold leading-none")}>
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
                    <View
                      id={"PRODUCTS"}
                      style={tw("flex flex-col w-[100px] ")}
                    >
                      {filtered.map((appProduct) => {
                        const appDisplay =
                          appProduct.productCommon.unitConfigDisplay.format({
                            amount: appProduct.amount,
                            targetContexts: ["app"],
                            rounding: "round",
                          }).formattedString;
                        return (
                          <View
                            key={appProduct.productCommon.productCode}
                            style={tw("flex flex-row gap-1 text-xs")}
                          >
                            <Text style={tw("text-left")}>
                              {appProduct.productCommon.productCode}
                            </Text>
                            <Text>{appDisplay}</Text>
                          </View>
                        );
                      })}
                    </View>
                    <View
                      id={"PRIORITY"}
                      style={tw(
                        "flex flex-col text-sm text-right w-[120px] self-center",
                      )}
                    >
                      {preNotify && <Text>{preNotify}</Text>}
                      {asap && <Text>{asap}</Text>}
                      {promised && <Text>{promised}</Text>}
                    </View>
                  </View>
                  {hasNotes && (
                    <View
                      style={tw("flex flex-row items-center justify-center")}
                    >
                      <View
                        id={"DIVIDER-1"}
                        style={tw(
                          "w-[90%] h-[1px] border-t border-gray-300 border-dashed",
                        )}
                      />
                    </View>
                  )}

                  <View id={"NOTES"} style={tw("flex flex-row gap-1 text-xs")}>
                    {custNote && (
                      <View style={tw(`flex flex-col max-w-[${widthCalc}%]`)}>
                        <Text style={tw("font-bold")}>Customer Note:</Text>
                        <Text style={tw("p-1")}>{custNote}</Text>
                      </View>
                    )}
                    {progNote && (
                      <View style={tw(`flex flex-col max-w-[${widthCalc}%]`)}>
                        <Text style={tw("font-bold")}>Program Note:</Text>
                        <Text style={tw("p-1")}>{progNote}</Text>
                      </View>
                    )}
                    {servNote && (
                      <View style={tw(`flex flex-col max-w-[${widthCalc}%]`)}>
                        <Text style={tw("font-bold")}>Service Note:</Text>
                        <Text style={tw("p-1")}>{servNote}</Text>
                      </View>
                    )}
                  </View>
                  <View style={tw("flex flex-row items-center justify-center")}>
                    <View
                      id={"DIVIDER-1"}
                      style={tw(
                        "w-[90%] h-[1px] border-t border-gray-300 border-dashed",
                      )}
                    />
                  </View>
                  <View
                    style={tw("flex flex-row items-center justify-start gap-1")}
                  >
                    <Text style={tw("font-bold")}>History:</Text>
                    {history.map((hist) => {
                      return (
                        <View
                          key={hist.servCodeId + hist.doneDate}
                          style={tw(
                            "flex flex-col text-xs text-left border rounded-lg p-1",
                          )}
                        >
                          <Text>
                            {hist.servCodeId}-{hist.doneBy}
                          </Text>
                          <Text>
                            {hist.doneDate
                              ? prettyDate(hist.doneDate, "M/d/yy")
                              : ""}
                          </Text>
                          <View style={tw("flex flex-row gap-1")}>
                            {hist.conditions?.map((condition) => {
                              return (
                                <Text key={condition.conditionId}>
                                  {condition.desc}
                                </Text>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  <View
                    id={"REMAINING"}
                    style={tw("flex flex-row gap-1 flex-wrap text-xs")}
                  >
                    <Text style={tw("font-bold")}>Remaining:</Text>
                    {remaining.map((serv) => {
                      return (
                        <View
                          key={serv.servCodeId}
                          style={tw(
                            "flex flex-row border rounded-full p-1 items-center justify-center gap-2",
                          )}
                        >
                          <Text style={tw("")}>{serv.servCodeId}</Text>
                          {serv.isPrinted &&
                            serv.servCodeId !== service.servCodeId && (
                              <Text>
                                {prettyDate(
                                  serv.currentAssignedDate,
                                  "EEE MMM d",
                                )}
                                -{serv.currentAssignedTo}
                              </Text>
                            )}
                        </View>
                      );
                    })}
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
