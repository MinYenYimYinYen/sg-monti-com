import { useProgServ } from "@/app/realGreen/progServ/_lib/useProgServ";
import { useSelector } from "react-redux";
import { servCodeLookup } from "@/app/realGreen/progServ/_lib/selectors/servCodeLookups";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Toggle } from "@/style/components/toggle";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { ServCodeDoc } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetTitle,
} from "@/style/components/sheet";
import { Button } from "@/style/components/button";
import { SaveButton } from "@/components/SaveButton";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { ProductMasters } from "@/app/realGreen/progServ/_lib/components/servCodeEditor/ProductMasters";
import { ProductSingles } from "@/app/realGreen/progServ/_lib/components/servCodeEditor/ProductSingles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/style/components/tabs";
import { Label } from "@/style/components/label";

interface EditServCodeProps {
  servCodeId: string;
  onClose?: () => void;
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

export function EditDefaultProducts({
  servCodeId,
  onClose,
}: EditServCodeProps) {
  const { updateServCode } = useProgServ({});
  useProduct({ autoLoad: true });
  const servCode: ServCodeDoc | undefined = useSelector(
    servCodeLookup.docById(servCodeId),
  );

  const [selectedMasterIds, setSelectedMasterIds] = useState<number[]>([]);
  const [selectedSingleIds, setSelectedSingleIds] = useState<number[]>([]);

  if (!servCode) return null;
  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose?.()}>
      <SheetContent className={"sm:max-w-[540px] md:max-w-[720px] lg:max-w-[960px] flex flex-col h-full"}>
        <div className="flex-none">
          <SheetTitle>Edit Default Products: {servCodeId}</SheetTitle>
          <SheetDescription>
            Configure default products for this service code
          </SheetDescription>
        </div>

        <div className={"grid grid-cols-2 gap-4 flex-1 min-h-0 mt-4"}>
          <div id={"CHOOSE_PRODUCTS"} className="flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between mb-2 flex-none">
              <Label className="text-xs text-muted-foreground">
                Master Products ({selectedMasterIds.length} selected), Single Products ({selectedSingleIds.length} selected)
              </Label>
              {(selectedMasterIds.length > 0 || selectedSingleIds.length > 0) ? (
                <Button
                  variant={"outline"}
                  intensity={"soft"}
                  size={"sm"}
                  className="h-6 text-xs px-2"
                  onClick={() => {
                    setSelectedMasterIds([]);
                    setSelectedSingleIds([]);
                  }}
                >
                  Clear All
                </Button>
              ): <div className={"h-6"}/>}
            </div>
            <Tabs defaultValue="masters" className="w-full flex flex-col flex-1 min-h-0">
              <TabsList className="grid w-full grid-cols-2 flex-none">
                <TabsTrigger value="masters">Masters</TabsTrigger>
                <TabsTrigger value="singles">Singles</TabsTrigger>
              </TabsList>
              <TabsContent value="masters" className="flex-1 min-h-0 mt-2">
                <ProductMasters
                  selectedMasterIds={selectedMasterIds}
                  setSelectedMasterIds={setSelectedMasterIds}
                />
              </TabsContent>
              <TabsContent value="singles" className="flex-1 min-h-0 mt-2">
                <ProductSingles
                  selectedSingleIds={selectedSingleIds}
                  setSelectedSingleIds={setSelectedSingleIds}
                />
              </TabsContent>
            </Tabs>
          </div>
          <div id={"CONFIGURE_PRODUCTS"} className="flex flex-col h-full min-h-0 border rounded-md p-4">
            Configure
          </div>
        </div>
        <SheetFooter className="flex-none mt-4">
          <Button variant={"outline"} onClick={onClose}>
            Cancel
          </Button>
          <SaveButton status={"idle"}>Save Changes</SaveButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
