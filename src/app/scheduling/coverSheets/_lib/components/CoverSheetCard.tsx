"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/style/components/card";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { DollarSign, Hash, LandPlot } from "lucide-react";
import { Fragment } from "react";
import { Number } from "@/components/Number";
import { useServCodes } from "@/app/realGreen/customer/_lib/hooks/useServCodes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { loadoutBaseToAppProductCore } from "@/app/realGreen/customer/selectors/loadoutBaseToAppProductCore";
import { baseProductCommon } from "@/app/realGreen/product/_lib/baseProduct";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";

type ViewVariant = "countSizeRev" | "servCodes" | "products";

interface CoverSheetCardProps {
  variant: ViewVariant;
  date: string;
  employeeMap: Map<string, Service[]>;
}

export function CoverSheetCard({
  variant,
  date,
  employeeMap,
}: CoverSheetCardProps) {
  const productCommonMap = useSelector(productSelect.productCommonMap);
  const { getServCodeCounts } = useServCodes();

  const getPlannedAppProductTotal = (services: Service[]): AppProduct[] => {
    const allCores = services.flatMap((service) =>
      loadoutBaseToAppProductCore(service.loadoutInventory, service.servId),
    );
    const productMap = new Map<number, AppProduct>();
    allCores.forEach((core) => {
      const existing = productMap.get(core.productId);
      if (existing) {
        productMap.set(core.productId, { ...existing, amount: existing.amount + core.amount });
      } else {
        productMap.set(core.productId, {
          ...core,
          productCommon: productCommonMap.get(core.productId) ?? baseProductCommon,
        });
      }
    });
    return Array.from(productMap.values());
  };

  // Aggregate all services for the date header
  const allServices = Array.from(employeeMap.values()).flat();

  const renderDateHeader = () => {
    if (variant === "countSizeRev") {
      return (
        <CardDescription className={"grid grid-cols-3 gap-1 items-center"}>
          <div className={"flex items-center justify-center"}>
            <Hash className={"size-4"} />
            <Number>{allServices.length}</Number>
          </div>
          <div className={"flex items-center justify-center"}>
            <LandPlot className={"size-4"} />
           <Number>

            {allServices.reduce((acc, service) => acc + service.size, 0)}
           </Number>
          </div>
          <div className={"flex items-center justify-center"}>
            <Number isMoney={true}>{allServices.reduce((acc, service) => acc + service.price, 0)}</Number>
          </div>
        </CardDescription>
      );
    }

    if (variant === "products") {
      const appProducts = getPlannedAppProductTotal(allServices);
      return (
        <CardDescription className={"flex flex-col"}>
          <div
            className={"grid grid-cols-3 gap-1 items-center justify-between"}
          >
            {appProducts.map((product: AppProduct) => (
              <Fragment key={product.productId}>
                <p>{product.productCommon.productCode}</p>
                <div className={"flex items-center gap-1"}>
                  <Number>{product.amount}</Number>
                  <p>{product.productCommon.unit.desc}</p>
                </div>
                <div className={"flex items-center"}>
                  <LandPlot className={"size-4"} />
                  <Number>{product.treated}</Number>
                </div>
              </Fragment>
            ))}
          </div>
        </CardDescription>
      );
    }

    if (variant === "servCodes") {
      const servCodeCounts = getServCodeCounts(allServices);
      return (
        <CardDescription className={"grid grid-cols-4 gap-1 items-center"}>
          {servCodeCounts.map((servCodeCount) => (
            <Fragment key={servCodeCount.servCodeId}>
              <div className={"flex"}>
                <p>{servCodeCount.servCodeId}</p>
              </div>
              <div className={"flex"}>
                <Hash className={"size-4"} />
                <Number>{servCodeCount.count}</Number>
              </div>
              <div className={"flex"}>
                <LandPlot className={"size-4"} />
                <Number>{servCodeCount.size}</Number>
              </div>
              <div className={"flex"}>
                <DollarSign className={"size-4"} />
                <Number>{servCodeCount.price}</Number>
              </div>
            </Fragment>
          ))}
        </CardDescription>
      );
    }

    return null;
  };

  const renderEmployeeContent = () => {
    return [...employeeMap.keys()].map((employeeId) => {
      const eServs = employeeMap.get(employeeId)!;

      if (variant === "countSizeRev") {
        return (
          <div
            key={employeeId}
            className={
              "grid grid-cols-[max-content_1fr_1fr_1fr] gap-2 grow-0 border-1 p-1 mb-1 rounded-sm bg-accent/20"
            }
          >
            <p className={"font-semibold"}>{employeeId}</p>
            <div className={"flex items-center justify-center"}>
              <Hash className={"size-4"} />
              <Number>{eServs.length}</Number>
            </div>
            <div className={"flex items-center justify-center"}>
              <LandPlot className={"size-4"} />
              <Number>{eServs.reduce((acc, service) => acc + service.size, 0)}</Number>
            </div>
            <div className={"flex items-center justify-center"}>
              <DollarSign className={"size-4"} />
              <Number>{eServs.reduce((acc, service) => acc + service.price, 0)}</Number>
            </div>
          </div>
        );
      }

      if (variant === "products") {
        const eAppProducts = getPlannedAppProductTotal(eServs);
        return (
          <div
            key={employeeId}
            className={
              "flex flex-col gap-1 border-1 p-1 mb-1 rounded-sm bg-accent/20"
            }
          >
            <div className={"flex items-center justify-between"}>
              <p className={"font-semibold"}>{employeeId}</p>
            </div>
            <div className={"grid grid-cols-3 gap-1 items-center text-sm"}>
              {eAppProducts.map((product: AppProduct) => (
                <Fragment key={product.productId}>
                  <p>{product.productCommon.productCode}</p>
                  <div className={"flex items-center gap-1"}>
                    <Number>{product.amount}</Number>
                    <p>{product.productCommon.unit.desc}</p>
                  </div>
                  <div className={"flex items-center"}>
                    <LandPlot className={"size-4"} />
                    <Number>{product.treated}</Number>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        );
      }

      if (variant === "servCodes") {
        const eServCodeCounts = getServCodeCounts(eServs);
        return (
          <div
            key={employeeId}
            className={
              "flex flex-col gap-1 border-1 p-1 mb-1 rounded-sm bg-accent/20"
            }
          >
            <div className={"flex items-center justify-between"}>
              <p className={"font-semibold"}>{employeeId}</p>
            </div>
            <div className={"grid grid-cols-4 gap-1 items-center text-sm"}>
              {eServCodeCounts.map((servCodeCount) => (
                <Fragment key={servCodeCount.servCodeId}>
                  <p>{servCodeCount.servCodeId}</p>
                  <div className={"flex items-center"}>
                    <Hash className={"size-4"} />
                    <Number>{servCodeCount.count}</Number>
                  </div>
                  <div className={"flex items-center"}>
                    <LandPlot className={"size-4"} />
                    <Number>{servCodeCount.size}</Number>
                  </div>
                  <div className={"flex items-center"}>
                    <Number isMoney={true}>{servCodeCount.price}</Number>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        );
      }

      return null;
    });
  };

  return (
    <Card className={"flex flex-col gap-1 w-full md:w-auto min-w-[250px]"}>
      <CardHeader className={"p-1 bg-primary/20 rounded-t-lg "}>
        <CardTitle className={"border-b text-center pb-1"}>
          {prettyDate(date, "EEE, MMM d")}
        </CardTitle>
        {renderDateHeader()}
      </CardHeader>
      <CardContent className={"p-1"}>{renderEmployeeContent()}</CardContent>
      <CardFooter></CardFooter>
    </Card>
  );
}
