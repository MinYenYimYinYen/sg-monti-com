import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/style/components/card";
import { DollarSign, Hash, LandPlot } from "lucide-react";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { useSelector } from "react-redux";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";

export function CardCountSizeRev() {
  const servicesByDateAndEmployee = useSelector(
    coverSheetsSelect.servicesByDateAndEmployee,
  );

  return (
    <>
      {[...servicesByDateAndEmployee.keys()].map((date) => {
        const employeeMap = servicesByDateAndEmployee.get(date)!;
        const services = Array.from(employeeMap.values()).flat();

        return (
          <Card
            key={date}
            className={"flex flex-col gap-1 w-full md:w-auto min-w-[250px]"}
          >
            <CardHeader className={"p-1 bg-primary/20 rounded-t-lg "}>
              <CardTitle className={"border-b text-center pb-1"}>
                {prettyDate(date, "EEE, MMM d")}
              </CardTitle>
              <CardDescription
                className={"grid grid-cols-3 gap-1 items-center"}
              >
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
            </CardHeader>
            <CardContent className={"p-1"}>
              {[...employeeMap.keys()].map((employeeId) => {
                const eServs = employeeMap.get(employeeId)!;
                return (
                  <div
                    className={
                      "grid grid-cols-[max-content_1fr_1fr_1fr] gap-2 grow-0 border-1 p-1 mb-1 rounded-sm bg-accent/20"
                    }
                    key={employeeId}
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
                      {eServs.reduce(
                        (acc, service) => acc + service.price,
                        0,
                      )}
                    </div>
                  </div>
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
