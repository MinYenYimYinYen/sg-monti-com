"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { equipmentPackageSelect } from "@/app/equipment/equipmentPackage/equipmentPackageSelect";
import { useEquipmentPackage } from "@/app/equipment/equipmentPackage/useEquipmentPackage";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/style/components/tabs";
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
import { Equipment } from "@/app/equipment/EquipmentTypes";
import { MasterSubConfig } from "@/app/realGreen/product/list/tabs/masters/MasterSubConfig";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Info } from "lucide-react";

interface MasterEditPanelProps {
  master: ProductMaster;
  productName: string;
}

export function MasterEditPanel({ master, productName }: MasterEditPanelProps) {
  const { updateCategory, updateUnit, updateMasterSubProducts, updateMasterEquipmentPackages } = useProduct({});
  useEquipmentPackage({ autoLoad: true });
  const productSubs = useSelector(productSelect.productSubs);
  const allPackages = useSelector(equipmentPackageSelect.equipmentPackages);

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

  // --- Equipment Packages state ---
  const [packageIds, setPackageIds] = useState<string[]>(
    master.equipmentPackageIds,
  );
  const [defaultPackageId, setDefaultPackageId] = useState<string | null>(
    master.defaultPackageId,
  );
  const [pkgStatus, setPkgStatus] = useState<SaveStatus>("idle");

  // Reset all when the selected master changes
  React.useEffect(() => {
    setNewCategoryName(master.category);
    setCategoryStatus("idle");
    setNewUnitDesc(master.unit.desc as UnitLabel);
    setUnitStatus("idle");
    setConfigDocs(master.subProductConfigDocs);
    setSubsStatus("idle");
    setSearchTerm("");
    setPackageIds(master.equipmentPackageIds);
    setDefaultPackageId(master.defaultPackageId);
    setPkgStatus("idle");
  }, [
    master.productId,
    master.category,
    master.unit.unitId,
    master.unit.desc,
    master.subProductConfigDocs,
    master.equipmentPackageIds,
    master.defaultPackageId,
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
              mixedByEquipmentIds: [],
            },
          ],
    );
  };

  const updateRate = (productId: number, storedRate: number) => {
    setConfigDocs((prev) =>
      prev.map((c) => (c.subId === productId ? { ...c, storedRate } : c)),
    );
  };

  const updateMixedBy = (productId: number, equipmentIds: string[]) => {
    setConfigDocs((prev) =>
      prev.map((c) =>
        c.subId === productId ? { ...c, mixedByEquipmentIds: equipmentIds } : c,
      ),
    );
  };

  // Unique equipments across all saved packages on this master
  const availableEquipments = Array.from(
    new Map(
      master.equipmentPackages
        .flatMap((pkg) => pkg.equipments)
        .map((e) => [e.equipmentId, e]),
    ).values(),
  );

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
        <p className="text-sm text-muted-foreground">{productName}({master.productId})</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="equipment">
          <TabsList className="w-full justify-start">
            {/* Equipment Packages tab */}
            <TabsTrigger value="equipment" className="flex items-center gap-1.5">
              Equipment Packages
              <Badge variant="outline" className="ml-1 text-xs">
                {master.equipmentPackages.length}
              </Badge>
            </TabsTrigger>

            {/* Sub-Products tab with embedded info popover */}
            <TabsTrigger value="subs" className="flex items-center gap-1.5">
              Sub-Products
              <Badge variant="outline" className="ml-1 text-xs">
                {configDocs.length}
              </Badge>
              <span
                onClick={(e) => e.stopPropagation()}
                className="inline-flex"
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                  </PopoverTrigger>
                  <PopoverContent className="w-72 text-sm">
                    <p className="font-medium mb-1">Masters are recognized by SA5 settings:</p>
                    <p className="text-muted-foreground">For Production ✓ · Mobile Device ✓ · Master Product ✓</p>
                  </PopoverContent>
                </Popover>
              </span>
            </TabsTrigger>

            {/* Attributes tab with embedded info popover */}
            <TabsTrigger value="attributes" className="flex items-center gap-1.5">
              Attributes
              <span
                onClick={(e) => e.stopPropagation()}
                className="inline-flex"
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                  </PopoverTrigger>
                  <PopoverContent className="w-72 text-sm">
                    Category and unit changes affect all products sharing that category or unit in SA5.
                  </PopoverContent>
                </Popover>
              </span>
            </TabsTrigger>
          </TabsList>

          {/* ── Attributes ── */}
          <TabsContent value="attributes">
            <div className="space-y-4 pt-2">
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
          </TabsContent>

          {/* ── Sub-Products ── */}
          <TabsContent value="subs">
            <div className="space-y-4 pt-2">
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
                              availableEquipments={availableEquipments}
                              onRemove={toggleSub}
                              onUpdateRate={updateRate}
                              onUpdateMixedBy={updateMixedBy}
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
          </TabsContent>

          {/* ── Equipment Packages ── */}
          <TabsContent value="equipment">
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                {/* Available packages */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Available</Label>
                  <ScrollArea className="h-[300px] rounded-md border">
                    <div className="p-3 space-y-1.5">
                      {allPackages.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          No packages defined yet
                        </div>
                      ) : (
                        allPackages.map((pkg) => (
                          <div
                            key={pkg.packageId}
                            className="flex items-start space-x-3 rounded-md border p-2.5 hover:bg-accent/10 cursor-pointer"
                            onClick={() =>
                              setPackageIds((prev) =>
                                prev.includes(pkg.packageId)
                                  ? prev.filter((id) => id !== pkg.packageId)
                                  : [...prev, pkg.packageId],
                              )
                            }
                          >
                            <Checkbox
                              checked={packageIds.includes(pkg.packageId)}
                              onCheckedChange={() =>
                                setPackageIds((prev) =>
                                  prev.includes(pkg.packageId)
                                    ? prev.filter((id) => id !== pkg.packageId)
                                    : [...prev, pkg.packageId],
                                )
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs shrink-0">
                                  {pkg.packageId}
                                </Badge>
                                <span className="text-sm truncate">{pkg.description}</span>
                              </div>
                              {pkg.equipmentIds.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {pkg.equipmentIds.join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Assigned packages */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Assigned ({packageIds.length})
                  </Label>
                  <ScrollArea className="h-[300px] rounded-md border">
                    <div className="p-3 space-y-1.5">
                      {packageIds.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          No packages assigned
                        </div>
                      ) : (
                        packageIds.map((pkgId) => {
                          const pkg = allPackages.find((p) => p.packageId === pkgId);
                          const hydrated = master.equipmentPackages.find(
                            (p) => p.packageId === pkgId,
                          );
                          return (
                            <div
                              key={pkgId}
                              className="rounded-md border p-2.5 space-y-1.5"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {pkgId}
                                </Badge>
                                <span className="text-sm flex-1">
                                  {pkg?.description ?? pkgId}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setPackageIds((prev) => prev.filter((id) => id !== pkgId));
                    if (defaultPackageId === pkgId) setDefaultPackageId(null);
                  }}
                                >
                                  ×
                                </Button>
                              </div>
                              {hydrated && hydrated.equipments.map((equipment: Equipment) => (
                                <div
                                  key={equipment.equipmentId}
                                  className="flex items-center gap-2 pl-2 text-xs text-muted-foreground"
                                >
                                  <span className="font-mono">{equipment.equipmentId}</span>
                                  <span>→</span>
                                  <span>{equipment.appMethod.description}</span>
                                  {/*<span className="ml-auto">*/}
                                  {/*  {equipment.waterRate.toFixed(2)} gal/ksf*/}
                                  {/*</span>*/}
                                </div>
                              ))}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Default Package selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium whitespace-nowrap">Default Package:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-between font-normal"
                      disabled={packageIds.length === 0}
                    >
                      {defaultPackageId
                        ? (allPackages.find((p) => p.packageId === defaultPackageId)?.description ?? defaultPackageId)
                        : "None"}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setDefaultPackageId(null)}>
                      None
                    </DropdownMenuItem>
                    {packageIds.map((pkgId) => {
                      const pkg = allPackages.find((p) => p.packageId === pkgId);
                      return (
                        <DropdownMenuItem key={pkgId} onClick={() => setDefaultPackageId(pkgId)}>
                          {pkg?.description ?? pkgId}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPackageIds(master.equipmentPackageIds);
                    setDefaultPackageId(master.defaultPackageId);
                  }}
                  disabled={pkgStatus === "saving" || pkgStatus === "success"}
                >
                  Reset
                </Button>
                <SaveButton
                  onClick={async () => {
                    try {
                      setPkgStatus("saving");
                      await updateMasterEquipmentPackages({
                        masterId: master.productId,
                        equipmentPackageIds: packageIds,
                        defaultPackageId,
                      });
                      setPkgStatus("success");
                    } catch (e) {
                      console.error("Error saving equipment packages:", e);
                      setPkgStatus("idle");
                    }
                  }}
                  status={pkgStatus}
                  onSuccessComplete={() => setPkgStatus("idle")}
                >
                  Save Changes
                </SaveButton>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
