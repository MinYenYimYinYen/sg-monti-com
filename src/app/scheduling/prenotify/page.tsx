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
import { prenotifySelect } from "@/app/scheduling/prenotify/_lib/prenotifySelect";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/style/components/tabs";
import { MultiSelect, MultiSelectItem } from "@/components/MultiSelect";
import { NotificationType } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { PrenotifyByType } from "@/app/scheduling/prenotify/_lib/PrenotifyByType";

export default function Prenotify() {
  usePrenotify();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const prenotifications = useSelector(prenotifySelect.prenotifications);
  const summaries = useSelector(prenotifySelect.summaries);
  const dates = Array.from(prenotifications.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  const [selectedDate, setSelectedDate] = useState<string[]>([]);

  const selectedPrenotifies = Array.from(
    prenotifications.get(selectedDate[0])?.entries() ?? [],
  );

  const [selectedNotificationType, setSelectedNotificationType] =
    useState<NotificationType>(selectedPrenotifies[0]?.[0] ?? "");

  return (
    <Container variant={"page"} className="h-full flex flex-col flex-1">
      <h1 className={"text-2xl font-bold"}>Prenotify</h1>
      <div className={"mb-2"}>
        <UnservDropZone />
      </div>
      <div
        className={
          "flex-1 flex flex-row items-start justify-start min-h-0 gap-4"
        }
      >
        <ScrollArea className={"w-[20%] h-full flex-shrink-0"}>
          <div className={"flex flex-col gap-2"}>
            <MultiSelect
              mode={"single"}
              value={selectedDate}
              onValueChange={setSelectedDate}
            >
              <div className={"rounded-md border bg-popover shadow-md"}>
                {dates.map((date) => {
                  const summary = summaries.get(date)!;
                  return (
                    <MultiSelectItem value={date} key={date}>
                      <div>
                        <h3 className={"font-semibold text-lg"}>
                          {prettyDate(date, "EEE, MMM d")}
                        </h3>
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
                      </div>
                    </MultiSelectItem>
                  );
                })}
              </div>
            </MultiSelect>
          </div>
        </ScrollArea>
        <div className={"w-full h-full max-w-[80%] flex-1"}>
          <Tabs
            value={selectedNotificationType}
            onValueChange={(value) =>
              setSelectedNotificationType(value as NotificationType)
            }
          >
            <TabsList>
              {selectedDate.length > 0 &&
                selectedPrenotifies.map(([key, value]) => {
                  const count = Array.from(value.values()).length;
                  return (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className={"hover:bg-primary/10"}
                    >
                      {key}: {count}
                    </TabsTrigger>
                  );
                })}
            </TabsList>
            {selectedPrenotifies.map(([notificationType, _value]) => {
              return (
                <TabsContent key={notificationType} value={notificationType}>
                  <PrenotifyByType
                    date={selectedDate[0] ?? ""}
                    type={notificationType}
                  />
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
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
