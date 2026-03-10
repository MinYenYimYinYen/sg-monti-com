import { NotificationType } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { useSelector } from "react-redux";
import {
  EmailPreNotifData,
  getMessages,
  PrenotificationData,
  prenotifySelect,
  RoboPreNotifData,
  TextPreNotifData,
} from "@/app/scheduling/prenotify/_lib/prenotifySelect";
import { Fragment, useMemo, useState } from "react";
import CopyDiv from "@/components/CopyDiv";
import { Toggle } from "@/style/components/toggle";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { Badge } from "@/style/components/badge";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { Tabs, TabsContent, TabsTrigger } from "@/style/components/tabs";
import { TabsList } from "@radix-ui/react-tabs";

export function PrenotifyByType({
  date,
  type,
}: {
  date: string;
  type: NotificationType;
}) {
  const messagePoints = useSelector(prenotifySelect.messagePoints(date, type));
  const Component = useMemo(() => {
    switch (type) {
      case "Phone":
        return PreNotifyRobo;
      case "Email":
        return PreNotifyEmail;
      case "Text":
        return PreNotifyText;
      case "Manual":
        return PreNotifyManual;
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  }, [type]);

  return <Component data={messagePoints as any} />;
}

function PreNotifyRobo({ data }: { data: RoboPreNotifData[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  const handleSelect = (value: string) => {
    let newSelected = [...selected];
    if (newSelected.includes(value)) {
      newSelected = newSelected.filter((v) => v !== value);
    } else {
      newSelected.push(value);
    }
    setSelected(newSelected);
  };

  const selectedData = data.filter((servPoints) =>
    selected.includes(servPoints.serviceName),
  );
  const combinedPoints = selectedData
    .map((servPoints) => servPoints.points)
    .flat();

  return (
    <div className={"flex flex-col gap-4"}>
      {data.map((servPoints) => {
        return (
          <div key={servPoints.serviceName}>
            <div>
              <Toggle
                pressed={selected.includes(servPoints.serviceName)}
                onPressedChange={() => handleSelect(servPoints.serviceName)}
              >
                <p className={"font-semibold"}>{servPoints.serviceName}</p>
              </Toggle>
            </div>
            <CopyDiv disabled={selected.includes(servPoints.serviceName)}>
              {servPoints.points.join(",")}
            </CopyDiv>
          </div>
        );
      })}
      {selected.length > 0 && (
        <Fragment>
          <div className={"flex items-center gap-1"}>
            <p className={"font-semibold"}>Combining:</p>
            <p>{selected.join(", ")}</p>
          </div>
          <CopyDiv>{combinedPoints.join(",")}</CopyDiv>
        </Fragment>
      )}
    </div>
  );
}

function PreNotifyEmail({ data }: { data: EmailPreNotifData[] }) {
  return (
    <div className={"flex flex-col gap-4"}>
      {data.map((emailData, index) => {
        const key = `${emailData.subject}-${index}`;
        return (
          <div key={key}>
            <div>
              <p className={"font-semibold"}>{emailData.hashKey}</p>
            </div>
            <CopyDiv>{emailData.subject}</CopyDiv>
            <CopyDiv>{emailData.message}</CopyDiv>
            <CopyDiv>{emailData.points.join(",")}</CopyDiv>
          </div>
        );
      })}
    </div>
  );
}

function PreNotifyText({ data }: { data: TextPreNotifData[] }) {
  return (
    <div>
      {data.map((textData, index) => {
        const key = `${textData.message}-${index}`;
        return (
          <div key={key}>
            <div>
              <p className={"font-semibold"}>{textData.hashKey}</p>
            </div>
            <CopyDiv>{textData.message}</CopyDiv>
            <CopyDiv>{textData.points.join(",")}</CopyDiv>
          </div>
        );
      })}
    </div>
  );
}

function PreNotifyManual({ data }: { data: PrenotificationData[] }) {
  return (
    <div>
      {data.map((manualData) => {
        const { callAheads, customer, services } = manualData;
        const allNotes = services.flatMap((service) => service.x.allTechNotes);
        const notes = Array.from(new Set(allNotes));

        const emailPN: EmailPreNotifData[] = getMessages[
          NotificationType.Email
        ](prettyDate(services[0].lastAssigned.schedDate, "EEE, MMM d"), [
          manualData,
        ]);

        const textPN: TextPreNotifData[] = getMessages[NotificationType.Text](
          prettyDate(services[0].lastAssigned.schedDate, "EEE, MMM d"),
          [manualData],
        );

        return (
          <div
            key={customer.custId}
            className={
              "bg-popover border border-muted-foreground/50 shadow-sm rounded-md p-2 space-y-2"
            }
          >
            <div className={"flex items-center gap-2"}>
              <CustomerLink
                customerId={customer.custId}
                customerTab={"customer"}
                className={"font-semibold underline"}
              >
                {customer.displayName}
              </CustomerLink>
              {callAheads.map((callAhead) => (
                <Badge key={callAhead.callAheadId}>
                  {callAhead.description}
                </Badge>
              ))}
            </div>
            <div className={"flex gap-2 max-h-[3rem]"}>
              {notes.map((note, index) => {
                return (
                  <div key={index} className={"flex-1"}>
                    <p>{note}</p>
                  </div>
                );
              })}
            </div>
            <Tabs defaultValue="email">
              <TabsList className={"grid w-full grid-cols-2"}>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="text">Text</TabsTrigger>
              </TabsList>
              <TabsContent value={"email"} className={"space-y-2"}>
                {emailPN.map((email, idx) => (
                  <div key={idx} className={"space-y-1"}>
                    <CopyDiv>{email.subject}</CopyDiv>
                    <CopyDiv>{email.message}</CopyDiv>
                    <CopyDiv>{email.points.join(",")}</CopyDiv>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value={"text"} className={"space-y-2"}>
                {textPN.map((text, idx) => (
                  <div key={idx} className={"space-y-1"}>
                    <CopyDiv>{text.message}</CopyDiv>
                    <CopyDiv>{text.points.join(",")}</CopyDiv>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        );
      })}
    </div>
  );
}
