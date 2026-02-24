"use client";
import { CardDescription } from "@/style/components/card";
import { LandPlot } from "lucide-react";
import { Fragment } from "react";
import { Number } from "@/components/Number";
import { useAppProducts } from "@/app/realGreen/customer/_lib/hooks/useAppProducts";
import { CoverSheetCard } from "./CoverSheetCard";

export function CardProducts() {
  const { getPlannedAppProductTotal } = useAppProducts();

  return (
    <CoverSheetCard
      renderDateHeader={(services) => {
        const appProducts = getPlannedAppProductTotal(services);
        return (
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
        );
      }}
      renderEmployeeContent={(employeeId, eServs) => {
        const eAppProducts = getPlannedAppProductTotal(eServs);
        return (
          <div
            className={
              "flex flex-col gap-1 border-1 p-1 mb-1 rounded-sm bg-accent/20"
            }
          >
            <div className={"flex items-center justify-between"}>
              <p className={"font-semibold"}>{employeeId}</p>
            </div>
            <div className={"grid grid-cols-3 gap-1 items-center text-sm"}>
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
        );
      }}
    />
  );
}
