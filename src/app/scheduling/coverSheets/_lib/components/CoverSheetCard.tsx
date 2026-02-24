import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/style/components/card";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { useSelector } from "react-redux";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import { ReactNode } from "react";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

interface CoverSheetCardProps {
  onClick?: (date: string, employeeId?: string) => void;
  renderDateHeader: (services: Service[]) => ReactNode;
  renderEmployeeContent: (employeeId: string, services: Service[]) => ReactNode;
}

export function CoverSheetCard({
  onClick,
  renderDateHeader,
  renderEmployeeContent,
}: CoverSheetCardProps) {
  const servicesByDateAndEmployee = useSelector(
    coverSheetsSelect.servicesByDateAndEmployee,
  );

  return (
    <div className={"flex gap-4 flex-wrap"}>
      {[...servicesByDateAndEmployee.keys()].map((date) => {
        const employeeMap = servicesByDateAndEmployee.get(date)!;
        const services = Array.from(employeeMap.values()).flat();

        return (
          <Card
            key={date}
            className={"flex flex-col gap-1 w-full md:w-auto min-w-[250px]"}
            onClick={onClick ? () => onClick(date) : undefined}
          >
            <CardHeader className={"p-1 bg-primary/20 rounded-t-lg "}>
              <CardTitle className={"border-b text-center pb-1"}>
                {prettyDate(date, "EEE, MMM d")}
              </CardTitle>
              {renderDateHeader(services)}
            </CardHeader>
            <CardContent className={"p-1"}>
              {[...employeeMap.keys()].map((employeeId) => {
                const eServs = employeeMap.get(employeeId)!;
                return (
                  <div
                    key={employeeId}
                    onClick={
                      onClick
                        ? (e) => {
                            e.stopPropagation();
                            onClick(date, employeeId);
                          }
                        : undefined
                    }
                  >
                    {renderEmployeeContent(employeeId, eServs)}
                  </div>
                );
              })}
            </CardContent>
            <CardFooter></CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
