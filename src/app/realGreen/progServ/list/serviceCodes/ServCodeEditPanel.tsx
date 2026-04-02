"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useProductRules } from "@/app/realGreen/progServ/_lib/hooks/useProductRules";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { servCodeLookup } from "@/app/realGreen/progServ/_lib/selectors/servCodeLookups";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Toggle } from "@/style/components/toggle";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Badge } from "@/style/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/style/components/card";
import { Label } from "@/style/components/label";
import { ScrollArea } from "@/style/components/scroll-area";
import { Separator } from "@/style/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { ShieldAlert, Trash2 } from "lucide-react";
import { ProductRuleDoc } from "@/app/realGreen/progServ/_lib/types/ProductRule";
import { getRuleId } from "@/app/realGreen/progServ/_lib/slice/progServActions";

type ServCodeEditPanelProps = {
  servCodeId: string;
};

export function ServCodeEditPanel({ servCodeId }: ServCodeEditPanelProps) {
  useProduct({ autoLoad: true });

  const { updateServCode } = useProgServ({});
  const {
    addProductRule,
    removeProductRule,
    updateSize,
    updateRuleOperator,
    addProductRuleProductMaster,
    removeProductRuleProductMaster,
  } = useProductRules({ servCodeId });

  const servCodeDoc = useSelector(servCodeLookup.docById(servCodeId));
  const productMasters = useSelector(productSelect.productMasters);

  const [selectedRuleIndex, setSelectedRuleIndex] = useState<number | null>(null);

  if (!servCodeDoc) return null;

  const rules = servCodeDoc.productRuleDocs;
  const selectedRule = selectedRuleIndex !== null ? rules[selectedRuleIndex] : null;

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <CardHeader className="py-3 shrink-0">
        <CardTitle className="text-base">{servCodeId}</CardTitle>
        <p className="text-sm text-muted-foreground">{servCodeDoc.longName}</p>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-4 pt-0">
        <div className="space-y-4 h-full flex flex-col">
          <div className={"flex items-end gap-4"}>
            {/* Date Range */}
            <div className="space-y-1.5 shrink-0">
              <Label className="text-sm font-medium">Date Range</Label>
              <DateRangePicker
                value={servCodeDoc.dateRange}
                onChange={(dateRange) =>
                  updateServCode({ servCodeId, dateRange })
                }
              />
            </div>

            {/* Always ASAP */}
            <div className="flex flex-col items-center  shrink-0">
              <Label className="text-sm font-medium">Always ASAP</Label>
              <Toggle
                pressed={servCodeDoc.alwaysAsap}
                onPressedChange={(value) =>
                  updateServCode({ servCodeId, alwaysAsap: value })
                }
                className="data-[state=on]:bg-destructive/20 data-[state=on]:text-destructive"
              >
                <ShieldAlert className="h-4 w-4" />
              </Toggle>
            </div>
          </div>

          <Separator className="shrink-0" />

          {/* Product Rules */}
          <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <Label className="text-sm font-medium">
                Default Product Rules
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  {rules.length}
                </Badge>
              </Label>
              <Button
                onClick={addProductRule}
                size="sm"
                variant="primary"
                intensity="soft"
              >
                Add Rule
              </Button>
            </div>

            <div className="flex-1 overflow-hidden grid grid-cols-2 gap-3 min-h-0">
              {/* Left: Rules list */}
              <div className="flex flex-col gap-2 min-h-0">
                <Label className="text-xs text-muted-foreground shrink-0">
                  Rules
                </Label>
                <ScrollArea className="flex-1 rounded-md border">
                  <div className="p-2 space-y-1.5">
                    {rules.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        No rules defined
                      </p>
                    ) : (
                      rules.map((rule, index) => (
                        <div
                          key={getRuleId(rule)}
                          className={`cursor-pointer rounded-md border p-2.5 transition-colors ${
                            selectedRuleIndex === index
                              ? "border-primary bg-primary/5"
                              : "hover:bg-accent/50"
                          }`}
                          onClick={() => setSelectedRuleIndex(index)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs font-medium w-12">
                                Size:
                              </span>
                              <Input
                                type="number"
                                value={rule.size}
                                onChange={(e) =>
                                  updateSize(rule, Number(e.target.value))
                                }
                                className="h-7 w-20 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <Button
                              variant="primary"
                              intensity="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
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
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs font-medium w-12">
                              Op:
                            </span>
                            <Select
                              value={rule.sizeOperator}
                              onValueChange={(
                                value: ProductRuleDoc["sizeOperator"],
                              ) => updateRuleOperator(rule, value)}
                            >
                              <SelectTrigger className="h-7 flex-1 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lte">≤ LTE</SelectItem>
                                <SelectItem value="gt">&gt; GT</SelectItem>
                                <SelectItem value="all">All</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {rule.productMasterIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {rule.productMasterIds.map((id) => {
                                const master = productMasters.find(
                                  (m) => m.productId === id,
                                );
                                return (
                                  <Badge
                                    key={id}
                                    variant="secondary"
                                    intensity="soft"
                                    className="text-[10px] px-1.5 py-0 h-4 font-normal"
                                  >
                                    {master?.description ?? id}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Product master picker */}
              <div className="flex flex-col gap-2 min-h-0">
                <Label className="text-xs text-muted-foreground shrink-0">
                  {selectedRule
                    ? "Select Products"
                    : "Select a rule to add products"}
                </Label>
                <ScrollArea className="flex-1 rounded-md border">
                  <div className="p-2 space-y-1">
                    {!selectedRule ? (
                      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                        Select a rule first
                      </div>
                    ) : (
                      productMasters.map((master) => {
                        const isSelected =
                          selectedRule.productMasterIds.includes(
                            master.productId,
                          );
                        return (
                          <div
                            key={master.productId}
                            className="flex items-center justify-between p-1.5 rounded-md border hover:bg-accent/50 cursor-pointer"
                            onClick={() => {
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
                          >
                            <span className="text-xs truncate mr-2">
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
                              className="h-6 px-2 shrink-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground text-[10px]"
                            >
                              {isSelected ? "✓" : "+"}
                            </Toggle>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
