import { useSelector } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { AppMethodSection } from "./AppMethodSection";
import { SubProductSection } from "./SubProductSection";
import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { useEffect } from "react";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectValue } from "@/components/multiselect/MultiSelectValue";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { EquipmentPackage } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";

type MasterProductCardProps = {
  masterProductId: number;
};

export function MasterProductCard({ masterProductId }: MasterProductCardProps) {
  const loadoutInventory = useSelector(loadoutFormSelect.serviceResolvedLoadoutInventory);
  const packageSelections = useSelector(loadoutFormSelect.packageSelections);
  const { setPackageSelection } = useLoadoutForm();

  const master = loadoutInventory.masters.find(
    (m) => m.product.productId === masterProductId,
  );

  const packages = master?.product.equipmentPackages ?? [];

  const selectedPackageId =
    packageSelections.find((s) => s.masterProductId === masterProductId)
      ?.selectedPackageId ?? null;

  // Auto-select when there is exactly one package
  useEffect(() => {
    if (packages.length === 1 && !selectedPackageId) {
      setPackageSelection(masterProductId, packages[0].packageId);
    }
  }, [masterProductId, packages, selectedPackageId, setPackageSelection]);

  if (!master) return null;

  return (
    <div className={"flex flex-col gap-2 w-full bg-accent/20 rounded-lg p-3"}>
      {/* Master Header */}
      <div className={"flex justify-between items-center"}>
        <div className={"text-xl font-bold text-foreground"}>
          {master.product.description}
        </div>
      </div>

      {/* Equipment Package selector — only shown when 2+ packages */}
      {packages.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Package:</span>
          <MultiSelect
            mode="single"
            value={selectedPackageId ? [selectedPackageId] : []}
            onValueChange={(ids) => {
              if (ids[0]) setPackageSelection(masterProductId, ids[0]);
            }}
            getDisplayValue={(id) =>
              packages.find((p: EquipmentPackage) => p.packageId === id)?.description ?? id
            }
            className="bg-card rounded-md flex-1"
          >
            <MultiSelectTrigger>
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
      {master.equipmentEntries.map((entry) => (
        <AppMethodSection
          key={entry.equipmentId}
          masterProductId={masterProductId}
          equipmentId={entry.equipmentId}
        />
      ))}

      {/* SubProducts Section */}
      <SubProductSection masterProductId={masterProductId} />
    </div>
  );
}
