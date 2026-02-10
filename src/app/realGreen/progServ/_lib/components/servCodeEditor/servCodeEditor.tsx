import { useProgServ } from "@/app/realGreen/progServ/_lib/useProgServ";
import { useSelector } from "react-redux";
import { servCodeLookup } from "@/app/realGreen/progServ/_lib/selectors/servCodeLookups";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Toggle } from "@/style/components/toggle";
import { ShieldAlert } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetTitle,
} from "@/style/components/sheet";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { ProductMasters } from "@/app/realGreen/progServ/_lib/components/servCodeEditor/ProductMasters";
import { ProductSingles } from "@/app/realGreen/progServ/_lib/components/servCodeEditor/ProductSingles";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/style/components/tabs";
import { ServiceProductConfigurator } from "@/app/realGreen/progServ/_lib/components/servCodeEditor/ServiceProductConfigurator";
import { useState } from "react";

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

type EditDefaultProductsProps = {
  servCodeId: string;
  onClose?: () => void;
};

export function EditDefaultProducts({
  servCodeId,
  onClose,
}: EditDefaultProductsProps) {
  useProduct({ autoLoad: true });
  const servCodeDoc = useSelector(servCodeLookup.docById(servCodeId));

  const [selectedSingleIds, setSelectedSingleIds] = useState<number[]>([]);

  if (!servCodeDoc) return null;
  return (
    <Sheet
      open={!!servCodeId}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <SheetContent className={"sm:max-w-4xl w-full"}>
        <SheetTitle>{servCodeId} Default Products</SheetTitle>
        <SheetDescription>
          Configure default products for {servCodeDoc.longName}.
        </SheetDescription>
        <div className={"grid grid-cols-2 gap-2"}>
          <Tabs>
            <TabsList>
              <TabsTrigger value={"masters"}>Masters</TabsTrigger>
              <TabsTrigger value={"singles"}>Singles</TabsTrigger>
            </TabsList>
            <TabsContent value={"masters"}>
              <ProductMasters servCodeId={servCodeId} />
            </TabsContent>
            <TabsContent value={"singles"}>
              <ProductSingles
                selectedSingleIds={selectedSingleIds}
                setSelectedSingleIds={setSelectedSingleIds}
              />
            </TabsContent>
          </Tabs>
          <ServiceProductConfigurator />
        </div>
        <SheetFooter>footer</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
