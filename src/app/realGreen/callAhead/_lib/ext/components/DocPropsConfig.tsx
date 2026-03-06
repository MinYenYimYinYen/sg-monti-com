import { callAheadSelect } from "@/app/realGreen/callAhead/selectors/callAheadSelect";
import { useSelector } from "react-redux";
import {
  Collapsible,
  CollapsibleTrigger,
} from "@/style/components/collapsible";
import { useState } from "react";
import { keywordSelect } from "@/app/realGreen/callAhead/selectors/keywordSelect";
import EntityMultiSelector from "@/components/EntityMultiSelector";
import { Button } from "@/style/components/button";

export function DocPropsConfig({ callAheadId }: { callAheadId: number }) {
  const docMap = useSelector(callAheadSelect.callAheadDocMap);
  const doc = docMap.get(callAheadId);
  const keywordMap = useSelector(keywordSelect.keywordMap);
  const keywords = useSelector(keywordSelect.keywords);

  const [isKeywordsOpen, setIsKeywordsOpen] = useState(false);
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<string[]>([]);

  if (!doc) return null;
  return (
    <div className={"flex items-center gap-2"}>
      <div>{doc.callAheadId}</div>
      <div>{doc.description}</div>
      <Collapsible
        open={isKeywordsOpen}
        onOpenChange={setIsKeywordsOpen}
        className={"w-87.5"}
      >
        <CollapsibleTrigger asChild>
          <Button variant={"outline"} onClick={() => setIsKeywordsOpen(true)}>
            {selectedKeywordIds.length} selected
          </Button>
        </CollapsibleTrigger>
        <EntityMultiSelector
          items={keywords}
          getItemId={(keyword) => keyword.keywordId}
          getItemLabel={(keyword) => (
            <div className={"grid grid-cols-[10rem_1fr] gap-2"}>
              <div>{keyword.keywordId}</div>
              <div>{keyword.message}</div>
            </div>
          )}
          selectedIds={selectedKeywordIds}
          onChange={(ids) => setSelectedKeywordIds(ids)}
        />
      </Collapsible>
    </div>
  );
}
