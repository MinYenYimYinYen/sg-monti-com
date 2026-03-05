"use client";
import { usePrenotify } from "@/app/scheduling/prenotify/_lib/usePrenotify";
import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { Container } from "@/components/Containers";
import { ScrollArea } from "@/style/components/scroll-area";
import { UnservDropZone } from "@/app/scheduling/_libShared/UnservDropZone";
import { FooterPortal } from "@/components/FooterPortal";
import { Settings } from "lucide-react";
import { useState } from "react";
import { CallAheadConfig } from "@/app/realGreen/callAhead/_lib/ext/components/CallAheadConfig";

const selectPrintedByDate = createSelector(
  [centralSelect.services],
  (services) => {
    const servicesByDate = new Grouper(services)
      .groupBy((s) => {
        const schedDate = prettyDate(s.lastAssigned.schedDate, "EEE, MMM d", {
          fallback: "Need CSV",
        });
        return schedDate;
      })
      .toMap();
    return servicesByDate;
  },
);

const selectDateKeys = createSelector([selectPrintedByDate], (servicesByDate) =>
  Array.from(servicesByDate.keys()),
);

export default function Prenotify() {
  usePrenotify();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const printedByDate = useSelector(selectPrintedByDate);
  const dates = useSelector(selectDateKeys);

  return (
    <Container variant={"page"} className="h-full flex flex-col flex-1">
      <h1 className={"text-2xl font-bold"}>Prenotify</h1>
      <div className={"mb-2"}>
        <UnservDropZone />
      </div>
      <div className={"flex-1 flex flex-row items-start justify-start"}>
        <ScrollArea className={"dev-border w-[20%] h-full"}>
          {dates.map((date) => {
            const services = printedByDate.get(date)!;

            return <div key={date}></div>;
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
