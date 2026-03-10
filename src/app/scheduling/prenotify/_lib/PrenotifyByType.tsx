import { NotificationType } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { useSelector } from "react-redux";
import {
  EmailPreNotifData,
  PrenotificationData,
  prenotifySelect,
  RoboPreNotifData,
  TextPreNotifData,
} from "@/app/scheduling/prenotify/_lib/prenotifySelect";
import { useMemo } from "react";
import CopyDiv from "@/components/CopyDiv";

export function PrenotifyByType({
  date,
  type,
}: {
  date: string;
  type: NotificationType;
}) {
  const messagePoints = useSelector(prenotifySelect.messagePoints(date, type));
  const renderComponent = useMemo(() => {
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

  return renderComponent({ data: messagePoints as any });
}

function PreNotifyRobo({ data }: { data: RoboPreNotifData[] }) {
  return <CopyDiv>Test</CopyDiv>;
}

function PreNotifyEmail({ data }: { data: EmailPreNotifData[] }) {
  return <div></div>;
}

function PreNotifyText({ data }: { data: TextPreNotifData[] }) {
  return <div></div>;
}

function PreNotifyManual({ data }: { data: PrenotificationData[] }) {
  return <div></div>;
}
