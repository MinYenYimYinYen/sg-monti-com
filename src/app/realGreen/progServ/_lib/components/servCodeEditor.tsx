import { useProgServ } from "@/app/realGreen/progServ/_lib/useProgServ";
import { useSelector } from "react-redux";
import { servCodeLookup } from "@/app/realGreen/progServ/_lib/selectors/servCodeLookups";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Input } from "@/style/components/input";
import { Toggle } from "@/style/components/toggle";
import { ShieldAlert } from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import {
  ServCode,
  ServCodeDoc,
  ServCodeDocProps,
} from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import {
  Sheet,
  SheetContent,
  SheetDescription, SheetFooter,
  SheetTitle,
} from "@/style/components/sheet";
import { productSelect } from "@/app/realGreen/product/_lib/productSelectors";
import { Label } from "@/style/components/label";
import { Button } from "@/style/components/button";
import { ScrollArea } from "@/style/components/scroll-area";
import { Checkbox } from "@/style/components/checkbox";
import { Badge } from "@/style/components/badge";
import { SaveButton } from "@/components/SaveButton";

interface EditServCodeProps {
  servCodeId: string;
}

export function EditServCodeDates({ servCodeId }: EditServCodeProps) {
  const { updateServCode } = useProgServ({});
  const servCode = useSelector(servCodeLookup.docById(servCodeId));

  if (!servCode) return null;
  return (
    <div>
      <DateRangePicker
        value={servCode.dateRange}
        onChange={(dateRange) => updateServCode({ servCodeId, dateRange })}
      />
    </div>
  );
}

export function EditAlwaysAsap({ servCodeId }: EditServCodeProps) {
  const { updateServCode } = useProgServ({});
  const servCode = useSelector(servCodeLookup.docById(servCodeId));

  if (!servCode) return null;

  return (
    <div>
      <Toggle
        pressed={servCode.alwaysAsap}
        onPressedChange={(value) =>
          updateServCode({ servCodeId, alwaysAsap: value })
        }
        className="data-[state=on]:bg-destructive/20 data-[state=on]:text-destructive"
      >
        <ShieldAlert className="h-4 w-4" />
      </Toggle>
    </div>
  );
}

export function EditDefaultProducts({ servCodeId }: EditServCodeProps) {
  const { updateServCode } = useProgServ({});
  const servCode: ServCodeDoc | undefined = useSelector(
    servCodeLookup.docById(servCodeId),
  );
  const masters = useSelector(productSelect.productMasters);
  const singles = useSelector(productSelect.productSingles);

  const [selectedMasterIds, setSelectedMasterIds] = useState<number[]>([]);
  const [selectedSingleIds, setSelectedSingleIds] = useState<number[]>([]);

  const handleSave = () => {
    // updateServCode({
    //   productDocs:
    // })
  }

  if (!servCode) return null;
  return (
    <Sheet key={servCodeId}>
      <SheetContent className={"sm:max-w-[540px]"}>
        <SheetTitle>Edit Default Products: {servCodeId}</SheetTitle>
        <SheetDescription>
          Configure default products for this service code
        </SheetDescription>
        <div className="space-y-2">
          <Label>Master Products: ({selectedMasterIds.length} selected))</Label>
          {selectedMasterIds.length > 0 && (
            <Button
              variant={"outline"}
              intensity={"soft"}
              onClick={() => setSelectedMasterIds([])}
            >
              Clear All
            </Button>
          )}
        </div>
        <h3 className={"font-bold"}>Master Products:</h3>
        <ScrollArea className={"h-[400px] rounded-md border"}>
          <div className="p-4 space-y-2">
            {masters.map((master) => (
              <div key={master.productId}>
                <Checkbox
                  checked={selectedMasterIds.includes(master.productId)}
                />
                <div className={"flex-1 space-y-1"}>
                  <div className={"flex items-center gap-2"}>
                    <span className={"font-mono text-sm text-muted-foreground"}>
                      {master.productCode}
                    </span>
                    <span className={"text-sm font-medium"}>
                      {master.description}
                    </span>
                  </div>
                  <div className={"text-xs text-muted-foreground"}>
                    Category: {master.category}
                  </div>
                  <div className={"inline-flex items-center gap-2"}>
                    {master.subProducts.map((sub) => (
                      <Badge key={sub.productId} variant={"outline"}>
                        {sub.productCode}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="space-y-2 pt-4">
          <Label>Single Products: ({selectedSingleIds.length} selected)</Label>
          {selectedSingleIds.length > 0 && (
            <Button
              variant={"outline"}
              intensity={"soft"}
              onClick={() => setSelectedSingleIds([])}
            >
              Clear All
            </Button>
          )}
        </div>
        <h3 className={"font-bold"}>Single Products:</h3>
        <ScrollArea className={"h-[400px] rounded-md border"}>
          <div className="p-4 space-y-2">
            {singles.map((single) => (
              <div key={single.productId}>
                <Checkbox
                  checked={selectedSingleIds.includes(single.productId)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedSingleIds((prev) => [
                        ...prev,
                        single.productId,
                      ]);
                    } else {
                      setSelectedSingleIds((prev) =>
                        prev.filter((id) => id !== single.productId),
                      );
                    }
                  }}
                />
                <div className={"flex-1 space-y-1"}>
                  <div className={"flex items-center gap-2"}>
                    <span className={"font-mono text-sm text-muted-foreground"}>
                      {single.productCode}
                    </span>
                    <span className={"text-sm font-medium"}>
                      {single.description}
                    </span>
                  </div>
                  <div className={"text-xs text-muted-foreground"}>
                    Category: {single.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <SheetFooter>
          <Button variant={"outline"}>Cancel</Button>
          <SaveButton status={"idle"}>
            Save Changes
          </SaveButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
