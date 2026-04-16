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
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { NotificationType } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { PrenotifyByType } from "@/app/scheduling/prenotify/_lib/PrenotifyByType";
import { PromiseDisplay } from "@/app/scheduling/prenotify/_lib/PromiseDisplay";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";

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
    <Container variant={"scroll-shell"}>
      <h1 className={"shrink-0 text-2xl font-bold"}>Prenotify</h1>
      <div className={"shrink-0 mb-2"}>
        <UnservDropZone />
      </div>

      {/* Two-column layout — stretch (default) so both panels fill the row height */}
      <div className="flex-1 flex flex-row min-h-0 gap-4">

        {/* Left: date selector list */}
        <ScrollArea className="w-[20%] shrink-0 h-full">
          <div className="flex flex-col gap-2">
            <MultiSelect
              mode={"single"}
              value={selectedDate}
              onValueChange={setSelectedDate}
            >
              <div className="rounded-md border bg-popover shadow-md">
                {dates.map((date) => {
                  const summary = summaries.get(date)!;
                  return (
                    <MultiSelectItem value={date} key={date}>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {prettyDate(date, "EEE, MMM d")}
                        </h3>
                        <div className="grid grid-cols-[1fr_4rem] gap-1">
                          {Array.from(summary.notificationCounts.entries()).map(
                            ([type, count]) => (
                              <Fragment key={type}>
                                <p>{type}:</p>
                                <p className="text-right">{count}</p>
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

        {/* Right: tabs with sticky header and scrolling content */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <Tabs
            value={selectedNotificationType}
            onValueChange={(value) =>
              setSelectedNotificationType(value as NotificationType)
            }
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="shrink-0">
              {selectedDate.length > 0 &&
                selectedPrenotifies.map(([key, value]) => {
                  const count = Array.from(value.values()).length;
                  return (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="hover:bg-primary/10"
                    >
                      {key}: {count}
                    </TabsTrigger>
                  );
                })}
              <TabsTrigger value={"promises"}>Promises</TabsTrigger>
            </TabsList>

            {selectedPrenotifies.map(([notificationType, _value]) => (
              <TabsContent
                key={notificationType}
                value={notificationType}
                className="flex-1 min-h-0 overflow-y-auto"
              >
                <PrenotifyByType
                  date={selectedDate[0] ?? ""}
                  type={notificationType}
                />
              </TabsContent>
            ))}

            <TabsContent
              value={"promises"}
              className="flex-1 min-h-0 overflow-y-auto"
            >
              <PromiseDisplay schedDate={selectedDate[0] ?? ""} />
            </TabsContent>
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
