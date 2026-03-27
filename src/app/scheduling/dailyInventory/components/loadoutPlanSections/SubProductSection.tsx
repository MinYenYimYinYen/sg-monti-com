import { useSelector } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { PendingProductSlot } from "./PendingProductSlot";
import { SubProductInput } from "./SubProductInput";

type SubProductSectionProps = {
  masterProductId: number;
};

export function SubProductSection({ masterProductId }: SubProductSectionProps) {
  const loadoutInventory = useSelector(loadoutFormSelect.serviceResolvedLoadoutInventory);
  const loadout = useSelector(loadoutFormSelect.loadout.data);
  const pendingSlots = useSelector(loadoutFormSelect.pendingProductSlots);

  // Find planned master
  const plannedMaster = loadoutInventory.masters.find(
    (m) => m.product.productId === masterProductId,
  );

  // Get master index
  const masterIndex = loadout.masters.findIndex(
    (m) => m.product.productId === masterProductId
  );

  if (!plannedMaster || plannedMaster.subProducts.length === 0) return null;

  // Filter pending slots for this master
  const masterPendingSlots = pendingSlots.filter(
    (slot) => slot.masterId === masterProductId,
  );

  return (
    <div className={"flex flex-col gap-2"}>
      {plannedMaster.subProducts.map((sub, subProductIndex) => (
        <SubProductInput
          key={sub.product.productId}
          masterProductId={masterProductId}
          subProductId={sub.product.productId}
          masterIndex={masterIndex}
          subProductIndex={subProductIndex}
        />
      ))}

      {/* Pending Slots for this Master */}
      {masterPendingSlots.map((slot) => (
        <PendingProductSlot key={slot.id} slotId={slot.id} />
      ))}
    </div>
  );
}
