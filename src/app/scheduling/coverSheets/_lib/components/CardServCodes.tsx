import { CardDescription } from "@/style/components/card";
import { DollarSign, Hash, LandPlot } from "lucide-react";
import { Fragment } from "react";
import { useServCodes } from "@/app/realGreen/customer/_lib/hooks/useServCodes";
import { Number } from "@/components/Number";
import { CoverSheetCard } from "./CoverSheetCard";

export function CardServCodes() {
  const { getServCodeCounts } = useServCodes();

  return (
    <CoverSheetCard
      renderDateHeader={(services) => {
        const servCodeCounts = getServCodeCounts(services);
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
      }}
      renderEmployeeContent={(employeeId, eServs) => {
        const eServCodeCounts = getServCodeCounts(eServs);
        return (
          <div
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
                    <DollarSign className={"size-4"} />
                    <Number>{servCodeCount.price}</Number>
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
