import { useSelector } from "react-redux";
import { prenotifySelect } from "@/app/scheduling/prenotify/_lib/prenotifySelect";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/style/components/card";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";

export function PromiseDisplay({ schedDate }: { schedDate?: string }) {
  const promiseDetails = useSelector(coverSheetsSelect.promiseDetails);
  //todo: filter optionally by schedDate
  const forDate = schedDate
    ? promiseDetails.filter((detail) => detail.schedDate === schedDate)
    : promiseDetails;

  const sorted = [...forDate].sort((a, b) => {
    // 1. Sort by Date
    const dateCompare = b.schedDate.localeCompare(a.schedDate);
    if (dateCompare !== 0) return dateCompare;

    // 2. If dates are equal, sort by Employee ID
    const empA = a.service.lastAssigned.employeeId;
    const empB = b.service.lastAssigned.employeeId;
    const empCompare = empA.toString().localeCompare(empB.toString());
    if (empCompare !== 0) return empCompare;

    // 3. If employees are also equal, sort by Sequence
    return a.service.lastAssigned.sequence - b.service.lastAssigned.sequence;
  });

  return (
    <div>
      {sorted.map((detail) => {
        const { service, schedDate, promiseDetails } = detail;

        const displayName = service.x.customer.displayName;
        const { servNote, progNote, custNote } = service.x.techNotes;
        const servCodeId = service.servCode.servCodeId;
        const assignedTo = service.lastAssigned.employeeId;

        return (
          <div key={detail.service.servId} className={""}>
            <Card>
              <CardHeader className={"p-2"}>
                <CardTitle>
                  {displayName}: {servCodeId} - {assignedTo} on{" "}
                  {prettyDate(schedDate, "EEE, MMM d")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={"grid grid-cols-[10rem_1fr]"}>
                  <div>Promise Checked?</div>
                  <div>{service.isPromised ? "Yes" : "No"}</div>

                  <div>Stop #:</div>
                  <div>{service.program.tempSeq}</div>

                  <div className={""}>Customer Note:</div>
                  <div>{custNote}</div>

                  <div className={""}>Program Note:</div>
                  <div>{progNote}</div>

                  <div className={""}>Service Note:</div>
                  <div>{servNote}</div>
                </div>
              </CardContent>
              {promiseDetails.map((detail, idx) => {
                // console.log("detail", detail);
                // const { } = detail;
                return (
                  <div key={idx} className={"grid grid-cols-[8rem_1fr]"}></div>
                );
              })}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
