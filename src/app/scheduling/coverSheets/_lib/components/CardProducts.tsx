"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/style/components/card";
import { LandPlot } from "lucide-react";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { useSelector } from "react-redux";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import { Fragment } from "react";
import { Number } from "@/components/Number";
import { useAppProducts } from "@/app/realGreen/customer/_lib/hooks/useAppProducts";

export function CardProducts() {
  const servicesByDateAndEmployee = useSelector(
    coverSheetsSelect.servicesByDateAndEmployee,
  );
  const { getPlannedAppProductTotal } = useAppProducts();

  return (
    <>
      {[...servicesByDateAndEmployee.keys()].map((date) => {
        const employeeMap = servicesByDateAndEmployee.get(date)!;
        const services = Array.from(employeeMap.values()).flat();
        const appProducts = getPlannedAppProductTotal(services);

        return (
          <Card
            key={date}
            className={"flex flex-col gap-1 w-full md:w-auto min-w-[250px]"}
          >
            <CardHeader className={"p-1 bg-primary/20 rounded-t-lg "}>
              <CardTitle className={"border-b text-center pb-1"}>
                {prettyDate(date, "EEE, MMM d")}
              </CardTitle>
              <CardDescription className={"flex flex-col"}>
                <div
                  className={
                    "grid grid-cols-3 gap-1 items-center justify-between"
                  }
                >
                  {appProducts.map((product) => (
                    <Fragment key={product.productId}>
                      <p>{product.productCommon.productCode}</p>
                      <div className={"flex items-center gap-1"}>
                        <Number>{product.amount}</Number>
                        <p>{product.productCommon.unit.desc}</p>
                      </div>
                      <div className={"flex items-center"}>
                        <LandPlot className={"size-4"} />
                        <p>{product.size}</p>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className={"p-1"}>
              {[...employeeMap.keys()].map((employeeId) => {
                const eServs = employeeMap.get(employeeId)!;
                const eAppProducts = getPlannedAppProductTotal(eServs);

                return (
                  <Fragment key={employeeId}>
                    <div className={"flex flex-col gap-1 border-1 p-1 mb-1 rounded-sm bg-accent/20"}>
                      <div className={"flex items-center justify-between"}>
                        <p className={"font-semibold"}>{employeeId}</p>
                      </div>
                      <div
                        className={
                          "grid grid-cols-3 gap-1 items-center text-sm"
                        }
                      >
                        {eAppProducts.map((product) => (
                          <Fragment key={product.productId}>
                            <p>{product.productCommon.productCode}</p>
                            <div className={"flex items-center gap-1"}>
                              <Number>{product.amount}</Number>
                              <p>{product.productCommon.unit.desc}</p>
                            </div>
                            <div className={"flex items-center"}>
                              <LandPlot className={"size-4"} />
                              <p>{product.size}</p>
                            </div>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </CardContent>
            <CardFooter></CardFooter>
          </Card>
        );
      })}
    </>
  );
}
