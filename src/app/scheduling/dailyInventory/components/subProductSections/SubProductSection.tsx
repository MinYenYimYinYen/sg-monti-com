import { useSelector } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { PendingProductSlot } from "../additionalProductsSection/PendingProductSlot";
import { SubProductInput } from "./SubProductInput";

type SubProductSectionProps = {
  masterProductId: number;
};

export function SubProductSection({ masterProductId }: SubProductSectionProps) {
  const loadoutInventory = useSelector(loadoutFormSelect.serviceResolvedLoadout);
  const loadout = useSelector(loadoutFormSelect.loadout.data);
  const pendingSlots = useSelector(loadoutFormSelect.pendingProductSlots);

  // ID-based lookups: masterProductId is passed as a prop (not the object) so React's
  // key-based reconciliation works correctly. masterProduct comes from the inventory
  // selector (display data); masterIndex comes from the loadout state and is needed for
  // index-based field paths used by the validation system in SubProductInput.
  const masterProduct = loadoutInventory.masters.find(
    (m) => m.product.productId === masterProductId,
  );

  const masterIndex = loadout.masters.findIndex(
    (m) => m.product.productId === masterProductId
  );

  if (!masterProduct || masterProduct.subProducts.length === 0) return null;

  // Filter pending slots for this master
  const masterPendingSlots = pendingSlots.filter(
    (slot) => slot.masterId === masterProductId,
  );

  return (
    <div className={"flex flex-col gap-2"}>
      {masterProduct.subProducts.map((sub, subProductIndex) => (
        <SubProductInput
          key={sub.product.productId}
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
