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
import { Fragment } from "react";
import { useServCodes } from "@/app/realGreen/customer/_lib/hooks/useServCodes";
import { Number } from "@/components/Number";

export function CardServCodes() {
  const servicesByDateAndEmployee = useSelector(
    coverSheetsSelect.servicesByDateAndEmployee,
  );
  const { getServCodeCounts } = useServCodes();

  return (
    <>
      {[...servicesByDateAndEmployee.keys()].map((date) => {
        const employeeMap = servicesByDateAndEmployee.get(date)!;
        const services = Array.from(employeeMap.values()).flat();
        const servCodeCounts = getServCodeCounts(services);
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
                className={"grid grid-cols-4 gap-1 items-center"}
              >
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
            </CardHeader>
            <CardContent className={"p-1"}>
              {[...employeeMap.keys()].map((employeeId) => {
                const eServs = employeeMap.get(employeeId)!;
                const eServCodeCounts = getServCodeCounts(eServs);

                return (
                  <Fragment key={employeeId}>
                    <div className={"flex flex-col gap-1 border-1 p-1 mb-1 rounded-sm bg-accent/20"}>
                      <div className={"flex items-center justify-between"}>
                        <p className={"font-semibold"}>{employeeId}</p>

                      </div>
                      <div
                        className={
                          "grid grid-cols-4 gap-1 items-center text-sm"
                        }
                      >
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
