"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { Button } from "@/style/components/button";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { Input } from "@/style/components/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/style/components/card";
import { Badge } from "@/style/components/badge";
import { ScrollArea } from "@/style/components/scroll-area";
import { Checkbox } from "@/style/components/checkbox";
import { Label } from "@/style/components/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import {
  UnitCRM,
  UnitLabel,
  getMetricForUL,
} from "@/app/realGreen/product/unitConfig/UnitTypes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/style/components/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";
import {
  ProductMaster,
  SubProductConfigDoc,
} from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { MasterSubConfig } from "@/app/realGreen/product/list/tabs/masters/MasterSubConfig";

interface MasterEditPanelProps {
  master: ProductMaster;
  productName: string;
}

export function MasterEditPanel({ master, productName }: MasterEditPanelProps) {
  const { updateCategory, updateUnit, updateMasterSubProducts } = useProduct(
    {},
  );
  const productSubs = useSelector(productSelect.productSubs);

  // --- Category state ---
  const [newCategoryName, setNewCategoryName] = useState(master.category);
  const [categoryStatus, setCategoryStatus] = useState<SaveStatus>("idle");

  // --- Unit state ---
  const [newUnitDesc, setNewUnitDesc] = useState<UnitLabel>(
    master.unit.desc as UnitLabel,
  );
  const [unitStatus, setUnitStatus] = useState<SaveStatus>("idle");

  // --- Sub-products state ---
  const [configDocs, setConfigDocs] = useState<SubProductConfigDoc[]>(
    master.subProductConfigDocs,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [subsStatus, setSubsStatus] = useState<SaveStatus>("idle");

  // Reset all when the selected master changes
  React.useEffect(() => {
    setNewCategoryName(master.category);
    setCategoryStatus("idle");
    setNewUnitDesc(master.unit.desc as UnitLabel);
    setUnitStatus("idle");
    setConfigDocs(master.subProductConfigDocs);
    setSubsStatus("idle");
    setSearchTerm("");
  }, [
    master.productId,
    master.category,
    master.unit.unitId,
    master.unit.desc,
    master.subProductConfigDocs,
  ]);

  const canSaveCategory =
    newCategoryName !== master.category && newCategoryName.trim().length > 0;
  const canSaveUnit =
    newUnitDesc !== master.unit.desc && master.unit.unitId !== baseNumId;

  const handleSaveCategory = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCategoryStatus("saving");
    try {
      await updateCategory(master.categoryId, trimmed);
      setCategoryStatus("success");
    } catch (error) {
      console.error("Failed to save category", error);
      setCategoryStatus("idle");
    }
  };

  const handleSaveUnit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSaveUnit) return;
    setUnitStatus("saving");
    try {
      await updateUnit({
        ...master.unit,
        desc: newUnitDesc,
        metric: getMetricForUL(newUnitDesc),
      } as UnitCRM);
      setUnitStatus("success");
    } catch (error) {
      console.error("Failed to save unit", error);
      setUnitStatus("idle");
    }
  };

  const availableSubs = productSubs
    .filter((doc) => doc.isProduction && !doc.isMobile)
    .filter((doc) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        doc.productCode.toLowerCase().includes(term) ||
        doc.description.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => a.productCode.localeCompare(b.productCode));

  const toggleSub = (productId: number) => {
    setConfigDocs((prev) =>
      prev.some((c) => c.subId === productId)
        ? prev.filter((c) => c.subId !== productId)
        : [
            ...prev,
            {
              subId: productId,
              storedRate: 0,
            },
          ],
    );
  };

  const updateRate = (productId: number, storedRate: number) => {
    setConfigDocs((prev) =>
      prev.map((c) => (c.subId === productId ? { ...c, storedRate } : c)),
    );
  };

  const handleSaveSubs = async () => {
    try {
      setSubsStatus("saving");
      await updateMasterSubProducts({
        masterId: master.productId,
        subProductConfigDocs: configDocs,
      });
      setSubsStatus("success");
    } catch (e) {
      console.error("Error updating master sub-products:", e);
      setSubsStatus("idle");
    }
  };

  return (
    <Card>
      <CardHeader className={"py-2"}>
        <CardTitle>Edit Master Product</CardTitle>
        <p className="text-sm text-muted-foreground">{productName}</p>
      </CardHeader>
      <CardContent>
        <Accordion
          type="multiple"
          defaultValue={["attributes", "subs"]}
          className={"space-y-2"}
        >
          {/* Attributes Section */}
          <AccordionItem value="attributes">
            <AccordionTrigger
              className={
                "text-lg bg-primary/20 rounded-t-md px-2 border border-b-primary/50 shadow-sm py-2"
              }
            >
              Attributes
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-1">
                {/* Category Row */}
                <form onSubmit={handleSaveCategory}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold whitespace-nowrap w-24">
                      Category
                    </span>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      ID: {master.categoryId}
                    </span>
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 min-w-[140px]"
                    />
                    <SaveButton
                      type="submit"
                      size="sm"
                      variant="primary"
                      onClick={handleSaveCategory}
                      disabled={!canSaveCategory}
                      status={categoryStatus}
                      onSuccessComplete={() => setCategoryStatus("idle")}
                    >
                      Save
                    </SaveButton>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setNewCategoryName(master.category)}
                      disabled={
                        !canSaveCategory ||
                        categoryStatus === "saving" ||
                        categoryStatus === "success"
                      }
                    >
                      Reset
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-[calc(6rem+0.75rem)]">
                    Updates the category for all products in this category. Does
                    not affect SA5 data.
                  </p>
                </form>

                {/* Unit Row */}
                <form onSubmit={handleSaveUnit}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold whitespace-nowrap w-24">
                      Unit
                    </span>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      ID: {master.unit.unitId}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex-1 min-w-[140px] justify-between font-normal"
                        >
                          {newUnitDesc}
                          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {Object.values(UnitLabel).map((ulValue) => (
                          <DropdownMenuItem
                            key={ulValue}
                            onClick={() => setNewUnitDesc(ulValue)}
                          >
                            {ulValue}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <SaveButton
                      type="submit"
                      size="sm"
                      variant="primary"
                      onClick={handleSaveUnit}
                      disabled={!canSaveUnit}
                      status={unitStatus}
                      onSuccessComplete={() => setUnitStatus("idle")}
                    >
                      Save
                    </SaveButton>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setNewUnitDesc(master.unit.desc as UnitLabel)
                      }
                      disabled={
                        !canSaveUnit ||
                        unitStatus === "saving" ||
                        unitStatus === "success"
                      }
                    >
                      Reset
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-[calc(6rem+0.75rem)]">
                    Updates the unit description for all products using this
                    unit.
                  </p>
                </form>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sub-Products Section */}
          <AccordionItem value="subs">
            <AccordionTrigger
              className={
                "text-lg bg-primary/20 rounded-t-md px-2 border border-b-primary/50 shadow-sm py-2"
              }
            >
              Sub-Products
              <Badge variant="outline" className="ml-2 mr-auto">
                {configDocs.length}
              </Badge>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-4">
                  {/* Available */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm font-medium whitespace-nowrap">
                        Available
                      </Label>
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <ScrollArea className="h-[300px] rounded-md border">
                      <div className="p-3 space-y-1.5">
                        {availableSubs.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-8">
                            No available sub-products found
                          </div>
                        ) : (
                          availableSubs.map((sub) => (
                            <div
                              key={sub.productId}
                              className="flex items-center space-x-3 rounded-md border p-2.5 hover:bg-accent/10 cursor-pointer"
                              onClick={() => toggleSub(sub.productId)}
                            >
                              <Checkbox
                                checked={configDocs.some(
                                  (c) => c.subId === sub.productId,
                                )}
                                onCheckedChange={() => toggleSub(sub.productId)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {sub.productCode}
                                  </span>
                                  <span className="text-sm">
                                    {sub.description}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Selected */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Selected ({configDocs.length})
                      </Label>
                      {configDocs.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfigDocs([])}
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="h-[300px] rounded-md border">
                      <div className="p-3 space-y-1.5">
                        {configDocs.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-8">
                            No sub-products selected
                          </div>
                        ) : (
                          configDocs.map((config) => {
                            const sub = availableSubs.find(
                              (s) => s.productId === config.subId,
                            );
                            return (
                              <MasterSubConfig
                                key={config.subId}
                                config={config}
                                subProduct={sub}
                                onRemove={toggleSub}
                                onUpdateRate={updateRate}
                              />
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfigDocs(master.subProductConfigDocs)}
                    disabled={
                      subsStatus === "saving" || subsStatus === "success"
                    }
                  >
                    Reset
                  </Button>
                  <SaveButton
                    onClick={handleSaveSubs}
                    status={subsStatus}
                    onSuccessComplete={() => setSubsStatus("idle")}
                  >
                    Save Changes
                  </SaveButton>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
