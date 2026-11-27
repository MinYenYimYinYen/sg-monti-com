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
  const { getServCodeCounts } = useServCodes();

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
      return (
        <CardDescription className={"flex flex-col"}>
          {/*
            PLACEHOLDER: planned products. Intentionally empty. Planned products were removed
            from the cover sheet during the product / equipment refactor
            (src/productEquipmentRefac). We intend to rework this section after the refactor is
            complete.
          */}
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
            {/*
              PLACEHOLDER: planned products. Intentionally empty. Planned products were removed
              from the cover sheet during the product / equipment refactor
              (src/productEquipmentRefac). We intend to rework this section after the refactor is
              complete.
            */}
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
