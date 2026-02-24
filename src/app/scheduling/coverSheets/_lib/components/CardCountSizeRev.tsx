import { CardDescription } from "@/style/components/card";
import { DollarSign, Hash, LandPlot } from "lucide-react";
import { CoverSheetCard } from "./CoverSheetCard";

export function CardCountSizeRev() {
  return (
    <CoverSheetCard
      renderDateHeader={(services) => (
        <CardDescription className={"grid grid-cols-3 gap-1 items-center"}>
          <div className={"flex items-center justify-center"}>
            <Hash className={"size-4"} />
            {services.length}
          </div>
          <div className={"flex items-center justify-center"}>
            <LandPlot className={"size-4"} />
            {services.reduce((acc, service) => acc + service.size, 0)}
          </div>
          <div className={"flex items-center justify-center"}>
            <DollarSign className={"size-4"} />
            {services.reduce((acc, service) => acc + service.price, 0)}
          </div>
        </CardDescription>
      )}
      renderEmployeeContent={(employeeId, eServs) => (
        <div
          className={
            "grid grid-cols-[max-content_1fr_1fr_1fr] gap-2 grow-0 border-1 p-1 mb-1 rounded-sm bg-accent/20"
          }
        >
          <p className={"font-semibold"}>{employeeId}</p>
          <div className={"flex items-center justify-center"}>
            <Hash className={"size-4"} />
            {eServs.length}
          </div>
          <div className={"flex items-center justify-center"}>
            <LandPlot className={"size-4"} />
            {eServs.reduce((acc, service) => acc + service.size, 0)}
          </div>
          <div className={"flex items-center justify-center"}>
            <DollarSign className={"size-4"} />
            {eServs.reduce((acc, service) => acc + service.price, 0)}
          </div>
        </div>
      )}
    />
  );
}
