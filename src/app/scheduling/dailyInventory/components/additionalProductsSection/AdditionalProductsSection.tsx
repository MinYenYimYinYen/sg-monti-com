import { useSelector } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { Plus } from "lucide-react";
import { PendingProductSlot } from "./PendingProductSlot";
import { SingleProductInput } from "./SingleProductInput";
import { CustomSubProductInput } from "./CustomSubProductInput";

export function AdditionalProductsSection() {
  const { addPendingProductSlot } = useLoadoutForm();

  const loadout = useSelector(loadoutFormSelect.loadout.data);
  const pendingSlots = useSelector(loadoutFormSelect.pendingProductSlots);

  // Filter pending slots for custom products (no masterId)
  const customPendingSlots = pendingSlots.filter(
    (slot) => slot.masterId === undefined,
  );

  return (
    <div className={"flex flex-col gap-2 w-full bg-accent/20 rounded-lg p-3"}>
      <div className={"text-xl font-bold text-foreground"}>
        Additional Products
      </div>

      {/* Singles */}
      {loadout.singles.map((single, singleIndex) => (
        <SingleProductInput key={single.product.productId} singleIndex={singleIndex} />
      ))}

      {/* SubProducts */}
      {loadout.subProducts.map((sub, subIndex) => (
        <CustomSubProductInput key={sub.product.productId} subProductIndex={subIndex} />
      ))}

      {/* Pending Slots for CustomProducts */}
      {customPendingSlots.map((slot) => (
        <PendingProductSlot key={slot.id} slotId={slot.id} />
      ))}

      {/* Add Button for CustomProducts */}
      <button
        onClick={() => addPendingProductSlot()}
        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 mt-1"
      >
        <Plus className="h-4 w-4" />
        Add Product
      </button>
    </div>
  );
}
