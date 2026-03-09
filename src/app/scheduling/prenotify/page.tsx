"use client";
import { usePrenotify } from "@/app/scheduling/prenotify/_lib/usePrenotify";
import { useSelector } from "react-redux";
import { Container } from "@/components/Containers";
import { ScrollArea } from "@/style/components/scroll-area";
import { UnservDropZone } from "@/app/scheduling/_libShared/UnservDropZone";
import { FooterPortal } from "@/components/FooterPortal";
import { Settings } from "lucide-react";
import { Fragment, useState } from "react";
import { CallAheadConfig } from "@/app/realGreen/callAhead/_lib/ext/components/CallAheadConfig";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/style/components/card";
import { prenotifySelect } from "@/app/scheduling/prenotify/_lib/prenotifySelect";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";

export default function Prenotify() {
  usePrenotify();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const prenotifications = useSelector(prenotifySelect.prenotifications);
  const summaries = useSelector(prenotifySelect.summaries);
  const dates = Array.from(prenotifications.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <Container variant={"page"} className="h-full flex flex-col flex-1">
      <h1 className={"text-2xl font-bold"}>Prenotify</h1>
      <div className={"mb-2"}>
        <UnservDropZone />
      </div>
      <div className={"flex-1 flex flex-row items-start justify-start"}>
        <ScrollArea className={"dev-border w-[20%] h-full"}>
          {dates.map((date) => {
            const summary = summaries.get(date)!;
            return (
              <Card key={date}>
                <CardHeader className={"p-1"}>
                  <CardTitle>{prettyDate(date,"EEE, MMM d")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={"grid grid-cols-[1fr_4rem] gap-1"}>
                    {Array.from(summary.notificationCounts.entries()).map(
                      ([type, count]) => (
                        <Fragment key={type}>
                          <p>{type}:</p>
                          <p className={"text-right"}>{count}</p>
                        </Fragment>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </ScrollArea>
      </div>
      <FooterPortal>
        <Settings onClick={() => setIsConfigOpen(true)} className={"size-4"} />
        <CallAheadConfig
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
        />
      </FooterPortal>
    </Container>
  );
}
