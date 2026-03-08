import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/style/components/tabs";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { useState } from "react";
import { Badge } from "@/style/components/badge";
import { XIcon } from "lucide-react";
import { EntityMultiSelector } from "@/components/MultiSelect";

export function CoverSheetsConfigEditor() {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const {
    localCoverSheetsConfig,
    setLocalCoverSheetsConfig,
    canUpdate,
    updateSettings,
    cancelChanges,
  } = useGlobalSettings({
    autoLoad: true,
  });
  useFlag({ autoLoad: true });

  const flagDocs = useSelector(flagSelect.flagDocs);
  const flagDocMap = useSelector(flagSelect.flagDocMap);

  return (
    <div>
      <Tabs value={"showFlags"}>
        <TabsList
          className={
            "bg-primary/10 border-b border-primary/40 w-full flex items-center justify-start"
          }
        >
          <TabsTrigger value={"showFlags"}>
            Flags Printed on Cover Sheets
          </TabsTrigger>
        </TabsList>
        <TabsContent value={"showFlags"}>
          <div className={"flex gap-2 md:gap-6 w-full"}>
            <div className={"space-y-2"}>
              <EntityMultiSelector
                className={"max-h-[50vh] overflow-y-auto w-[20rem] truncate"}
                items={flagDocs}
                getItemId={(f) => f.flagId}
                getItemLabel={(f) => f.desc}
                selectedIds={localCoverSheetsConfig.flagIds}
                onChange={(ids) =>
                  setLocalCoverSheetsConfig({
                    ...localCoverSheetsConfig,
                    flagIds: ids,
                  })
                }
              />
              <div className={"w-[20rem] flex justify-between"}>
                <Button onClick={cancelChanges} variant={"destructive"} intensity={"soft"}>Cancel</Button>
                <SaveButton
                  status={saveStatus}
                  onSuccessComplete={() => setSaveStatus("idle")}
                  variant={"primary"}
                  disabled={!canUpdate}
                  onClick={() =>
                    updateSettings({
                      coverSheetsConfig: localCoverSheetsConfig,
                    })
                  }
                >
                  Save
                </SaveButton>
              </div>
            </div>
            <div
              className={
                "flex flex-wrap justify-start content-start gap-x-2 gap-y-2"
              }
            >
              {localCoverSheetsConfig.flagIds.map((id) => {
                const flag = flagDocMap.get(id);
                if (!flag) return null;
                return (
                  <Badge
                    className={
                      "h-4 pl-1 pr-3 py-1 text-sm flex items-center justify-center gap-1"
                    }
                    key={id}
                    variant={"primary"}
                  >
                    <Button size={"icon"} className={"size-3.5"}
                            onClick={() => setLocalCoverSheetsConfig({
                              ...localCoverSheetsConfig,
                              flagIds: localCoverSheetsConfig.flagIds.filter((f) => f !== id),
                            })}
                    >
                      <XIcon className={"size-4"}></XIcon>
                    </Button>
                    <p>{flag.desc}</p>
                  </Badge>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
