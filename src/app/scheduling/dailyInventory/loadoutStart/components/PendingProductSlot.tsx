import { useSelector } from "react-redux";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { X } from "lucide-react";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { MultiSelectValue } from "@/components/multiselect/MultiSelectValue";

type PendingProductSlotProps = {
  slotId: string;
};

export function PendingProductSlot({ slotId }: PendingProductSlotProps) {
  const {
    updatePendingSlotCategory,
    addProductToLoadout,
    removePendingProductSlot,
  } = useLoadoutStartForm();

  const productCategories = useSelector(loadoutStartSelect.productCategories);
  const productsForSlots = useSelector(loadoutStartSelect.productsForPendingSlots);
  const pendingSlots = useSelector(loadoutStartSelect.pendingProductSlots);

  const slot = pendingSlots.find((s) => s.id === slotId);
  const availableProducts = productsForSlots.get(slotId) ?? [];

  if (!slot) return null;

  const handleProductSelect = (product: ProductSub | ProductSingle | null) => {
    if (!product) return;
    // Immediately add product to loadout with null amount
    addProductToLoadout(slotId, product, null);
  };

  const handleCancel = () => {
    removePendingProductSlot(slotId);
  };

  return (
    <div className={"flex flex-wrap items-center gap-2 bg-accent/10 rounded px-2 py-1"}>
      {/* Category Selector */}
      <MultiSelect
        mode="single"
        className="flex-1 min-w-[200px]"
        value={slot.categoryFilter ? [slot.categoryFilter] : []}
        onValueChange={(values) => {
          updatePendingSlotCategory(slotId, values[0] || null);
        }}
      >
        <MultiSelectTrigger>
          <MultiSelectValue placeholder="Category" />
        </MultiSelectTrigger>
        <MultiSelectContent className={"max-h-48"}>
          {productCategories.map((category) => (
            <MultiSelectItem key={category} value={category}>
              {category}
            </MultiSelectItem>
          ))}
        </MultiSelectContent>
      </MultiSelect>

      {/* Product Selector */}
      <MultiSelect
        mode="single"
        className="flex-1 min-w-[200px]"
        value={[]}
        onValueChange={(values) => {
          handleProductSelect(values[0] || null);
        }}
        getValueKey={(product: ProductSub | ProductSingle) =>
          String(product.productId)
        }
        getDisplayValue={(product: ProductSub | ProductSingle) =>
          product.description
        }
      >
        <MultiSelectTrigger>
          <MultiSelectValue placeholder="Select product" />
        </MultiSelectTrigger>
        <MultiSelectContent className={"max-h-48"}>
          {availableProducts.map((product) => (
            <MultiSelectItem key={product.productId} value={product}>
              {product.description}
            </MultiSelectItem>
          ))}
        </MultiSelectContent>
      </MultiSelect>

      {/* Cancel Button */}
      <button
        onClick={handleCancel}
        className="text-destructive hover:text-destructive/80"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
