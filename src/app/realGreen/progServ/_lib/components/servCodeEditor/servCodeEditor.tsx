import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useSelector } from "react-redux";
import { servCodeLookup } from "@/app/realGreen/progServ/_lib/selectors/servCodeLookups";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Toggle } from "@/style/components/toggle";
import { ShieldAlert, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetTitle,
} from "@/style/components/sheet";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/style/components/tabs";
import { useState } from "react";
import { Button } from "@/style/components/button";
import { useProductRules } from "@/app/realGreen/progServ/_lib/hooks/useProductRules";
import { Input } from "@/style/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { ProductRuleDoc } from "@/app/realGreen/progServ/_lib/types/ProductRule";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/style/components/card";
import { Badge } from "@/style/components/badge";

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

export function EditProductRules({
  servCodeId,
  onClose,
}: EditDefaultProductsProps) {
  useProduct({ autoLoad: true });
  const servCodeDoc = useSelector(servCodeLookup.docById(servCodeId));
  const {
    addProductRule,
    removeProductRule,
    updateSize,
    updateRuleOperator,
    addProductRuleProductMaster,
    removeProductRuleProductMaster,
    addProductRuleProductSingle,
    removeProductRuleProductSingle,
  } = useProductRules({ servCodeId });

  const productMasters = useSelector(productSelect.productMasters);
  const productSingles = useSelector(productSelect.productSingles);

  const [selectedRuleIndex, setSelectedRuleIndex] = useState<number | null>(
    null,
  );

  if (!servCodeDoc) return null;
  const rules = servCodeDoc.productRuleDocs;

  const selectedRule =
    selectedRuleIndex !== null ? rules[selectedRuleIndex] : null;

  if (!servCodeDoc) return null;

  return (
    <Sheet
      open={!!servCodeId}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <SheetContent className={"sm:max-w-4xl w-full overflow-y-auto"}>
        <SheetTitle>{servCodeId} Default Products</SheetTitle>
        <SheetDescription>
          Configure default products for {servCodeDoc.longName}.
        </SheetDescription>
        <div className={"grid grid-cols-2 gap-4 mt-4"}>
          <div id={"Configurator"} className={"space-y-4"}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Rules</h3>
              <Button onClick={addProductRule} size="sm">
                Add Rule
              </Button>
            </div>
            <div className="space-y-2">
              {rules.map((rule, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-colors ${
                    selectedRuleIndex === index
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => setSelectedRuleIndex(index)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-medium w-16">Size:</span>
                        <Input
                          type="number"
                          value={rule.size}
                          onChange={(e) =>
                            updateSize(rule, Number(e.target.value))
                          }
                          className="h-8 w-24"
                        />
                      </div>
                      <Button
                        variant={"primary"}
                        intensity={"ghost"}
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProductRule({
                            size: rule.size,
                            sizeOperator: rule.sizeOperator,
                          });
                          if (selectedRuleIndex === index) {
                            setSelectedRuleIndex(null);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium w-16">
                        Operator:
                      </span>
                      <Select
                        value={rule.sizeOperator}
                        onValueChange={(
                          value: ProductRuleDoc["sizeOperator"],
                        ) => updateRuleOperator(rule, value)}
                      >
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lte">Less Than or Equal</SelectItem>
                          <SelectItem value="gt">Greater Than</SelectItem>
                          <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rule.productMasterIds.map((id) => {
                        const master = productMasters.find(
                          (m) => m.productId === id,
                        );
                        return (
                          <Badge
                            key={`m-${id}`}
                            variant="secondary"
                            className="text-xs"
                          >
                            {master?.description || id}
                          </Badge>
                        );
                      })}
                      {rule.productSingleIds.map((id) => {
                        const single = productSingles.find(
                          (s) => s.productId === id,
                        );
                        return (
                          <Badge
                            key={`s-${id}`}
                            variant="outline"
                            className="text-xs"
                          >
                            {single?.description || id}
                          </Badge>
                        );
                      })}
                      {rule.productMasterIds.length === 0 &&
                        rule.productSingleIds.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">
                            No products selected
                          </span>
                        )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div id={"Products"} className="space-y-4">
            <h3 className="text-lg font-semibold">
              {selectedRule
                ? "Select Products"
                : "Select a rule to add products"}
            </h3>
            {selectedRule ? (
              <Tabs defaultValue="masters" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="masters" className="flex-1">
                    Masters
                  </TabsTrigger>
                  <TabsTrigger value="singles" className="flex-1">
                    Singles
                  </TabsTrigger>
                </TabsList>
                <TabsContent
                  value="masters"
                  className="space-y-2 max-h-[60vh] overflow-y-auto pr-2"
                >
                  {productMasters.map((master) => {
                    const isSelected = selectedRule.productMasterIds.includes(
                      master.productId,
                    );
                    return (
                      <div
                        key={master.productId}
                        className="flex items-center justify-between p-2 rounded-md border hover:bg-accent/50"
                      >
                        <span className="text-sm truncate mr-2">
                          {master.description}
                        </span>
                        <Toggle
                          pressed={isSelected}
                          onPressedChange={() => {
                            if (isSelected) {
                              removeProductRuleProductMaster(
                                selectedRule,
                                master.productId,
                              );
                            } else {
                              addProductRuleProductMaster(
                                selectedRule,
                                master.productId,
                              );
                            }
                          }}
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                          {isSelected ? "Selected" : "Select"}
                        </Toggle>
                      </div>
                    );
                  })}
                </TabsContent>
                <TabsContent
                  value="singles"
                  className="space-y-2 max-h-[60vh] overflow-y-auto pr-2"
                >
                  {productSingles.map((single) => {
                    const isSelected = selectedRule.productSingleIds.includes(
                      single.productId,
                    );
                    return (
                      <div
                        key={single.productId}
                        className="flex items-center justify-between p-2 rounded-md border hover:bg-accent/50"
                      >
                        <span className="text-sm truncate mr-2">
                          {single.description}
                        </span>
                        <Toggle
                          pressed={isSelected}
                          onPressedChange={() => {
                            if (isSelected) {
                              removeProductRuleProductSingle(
                                selectedRule,
                                single.productId,
                              );
                            } else {
                              addProductRuleProductSingle(
                                selectedRule,
                                single.productId,
                              );
                            }
                          }}
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                          {isSelected ? "Selected" : "Select"}
                        </Toggle>
                      </div>
                    );
                  })}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
                Select a rule to configure products
              </div>
            )}
          </div>
        </div>
        <SheetFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
