import { useSelector } from "react-redux";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { EquipmentSection } from "./EquipmentSection";
import { SubProductSection } from "./SubProductSection";
import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";
import { useEffect, useMemo } from "react";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectValue } from "@/components/multiselect/MultiSelectValue";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { EquipmentPackage } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";
import { LandPlot } from "lucide-react";
import { cn, md } from "@/style/utils";

type MasterProductCardProps = {
  masterProductId: number;
};

export function MasterProductCard({ masterProductId }: MasterProductCardProps) {
  const loadoutInventory = useSelector(
    loadoutStartSelect.serviceResolvedLoadout,
  );
  const packageSelections = useSelector(loadoutStartSelect.packageSelections);
  const { setPackageSelection } = useLoadoutStartForm();
  const totalSize = useSelector(loadoutStartSelect.totalKsfForMaster(masterProductId))

  // ID-based lookup: receives masterProductId (not the object) so React's key-based
  // reconciliation works correctly. The planned inventory and the loadout state are two
  // separate trees; we look up from the planned inventory here to get display data.
  const masterProduct = loadoutInventory.masters.find(
    (m) => m.product.productId === masterProductId,
  );

  const packages = useMemo(
    () => masterProduct?.product.equipmentPackages ?? [],
    [masterProduct],
  );

  const selectedPackageId =
    packageSelections.find((s) => s.masterProductId === masterProductId)
      ?.selectedPackageId ?? null;

  // Auto-select: use the master's defaultPackage if configured, otherwise fall back to
  // auto-selecting when there is exactly one package. The worker can always override.
  useEffect(() => {
    if (selectedPackageId) return;
    const defaultPkg = masterProduct?.product.defaultPackage;
    if (defaultPkg) {
      setPackageSelection(masterProductId, defaultPkg.packageId);
    } else if (packages.length === 1) {
      setPackageSelection(masterProductId, packages[0].packageId);
    }
  }, [masterProductId, masterProduct, packages, selectedPackageId, setPackageSelection]);

  if (!masterProduct) return null;

  return (
    <div className={cn("flex flex-col gap-2 w-full bg-accent/20 rounded-lg p-2", md("p-3"))}>
      {/* Master Header */}
      <div className={"flex justify-between items-center"}>
        <div className={cn("text-base font-bold text-foreground", md("text-xl"))}>
          {masterProduct.product.description}
        </div>
        <div className="flex items-center gap-2">
          <LandPlot />
          <p>{totalSize}</p>
        </div>
      </div>

      {/* Equipment Package selector — only shown when 2+ packages */}
      {packages.length > 1 && (
        <div className={cn("flex flex-col gap-1", md("flex-row items-center gap-2"))}>
          <span className="text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
            Package:
          </span>
          <MultiSelect
            mode="single"
            value={selectedPackageId ? [selectedPackageId] : []}
            onValueChange={(ids) => {
              if (ids[0]) setPackageSelection(masterProductId, ids[0]);
            }}
            getDisplayValue={(id) =>
              packages.find((p: EquipmentPackage) => p.packageId === id)
                ?.description ?? id
            }
            className={cn("bg-card rounded-md w-full", md("flex-1"))}
          >
            <MultiSelectTrigger className="w-full overflow-hidden">
              <MultiSelectValue placeholder="Select equipment package…" />
            </MultiSelectTrigger>
            <MultiSelectContent>
              {packages.map((pkg: EquipmentPackage) => (
                <MultiSelectItem key={pkg.packageId} value={pkg.packageId}>
                  {pkg.description}
                </MultiSelectItem>
              ))}
            </MultiSelectContent>
          </MultiSelect>
        </div>
      )}

      {/* Equipment Entries Section */}
      {masterProduct.equipments.map((equipment) => (
        <EquipmentSection
          key={equipment.equipmentId}
          masterProductId={masterProductId}
          equipmentId={equipment.equipmentId}
        />
      ))}

      {/* SubProducts Section */}
      <SubProductSection masterProductId={masterProductId} />
    </div>
  );
}
