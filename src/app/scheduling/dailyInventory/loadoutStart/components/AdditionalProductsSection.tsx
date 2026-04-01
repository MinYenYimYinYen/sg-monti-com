import { useSelector } from "react-redux";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";
import { Plus } from "lucide-react";
import { PendingProductSlot } from "./PendingProductSlot";
import { SingleProductInput } from "./SingleProductInput";
import { CustomSubProductInput } from "./CustomSubProductInput";
import { cn, md } from "@/style/utils";

export function AdditionalProductsSection() {
  const { addPendingProductSlot } = useLoadoutStartForm();

  const loadout = useSelector(loadoutStartSelect.loadout.data);
  const pendingSlots = useSelector(loadoutStartSelect.pendingProductSlots);

  // Filter pending slots for custom products (no masterId)
  const customPendingSlots = pendingSlots.filter(
    (slot) => slot.masterId === undefined,
  );

  return (
    <div className={cn("flex flex-col gap-2 w-full bg-accent/20 rounded-lg p-2", md("p-3"))}>
      <div className={cn("text-base font-bold text-foreground", md("text-xl"))}>
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
