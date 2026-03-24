import { useSelector } from "react-redux";
import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";
import { useTechRoute } from "@/app/scheduling/techRoute/useTechRoute";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/MultiSelect";
import { Input } from "@/style/components/input";
import { Check, X } from "lucide-react";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { ScrollArea } from "@/style/components/scroll-area";

type PendingProductSlotProps = {
  slotId: string;
};

export function PendingProductSlot({ slotId }: PendingProductSlotProps) {
  const {
    updatePendingSlotCategory,
    updatePendingSlotProduct,
    updatePendingSlotAmount,
    addProductToLoadout,
    removePendingProductSlot,
  } = useTechRoute();

  const productCategories = useSelector(techRouteSelect.productCategories);
  const productsForSlots = useSelector(techRouteSelect.productsForPendingSlots);
  const pendingSlots = useSelector(techRouteSelect.pendingProductSlots);
  const pendingSlotProducts = useSelector(techRouteSelect.pendingSlotProducts);
  const pendingSlotAmounts = useSelector(techRouteSelect.pendingSlotAmounts);

  const slot = pendingSlots.find((s) => s.id === slotId);
  const availableProducts = productsForSlots.get(slotId) ?? [];
  const selectedProduct = pendingSlotProducts[slotId];
  const amount = pendingSlotAmounts[slotId] ?? "";

  if (!slot) return null;

  const handleConfirm = () => {
    if (!selectedProduct || !amount) return;

    const loadAmount = parseFloat(amount);
    if (isNaN(loadAmount) || loadAmount <= 0) return;

    // Convert load units to app units for storage
    const appAmount = convertQuantity(
      loadAmount,
      "load",
      "app",
      selectedProduct.unitConfig,
    );

    addProductToLoadout(slotId, selectedProduct, appAmount);
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
        value={selectedProduct ? [selectedProduct] : []}
        onValueChange={(values) => {
          updatePendingSlotProduct(slotId, values[0] || null);
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

      {/* Amount Input */}
      <Input
        type="number"
        placeholder="Amount"
        className="w-24 min-w-[80px]"
        value={amount}
        onChange={(e) => {
          updatePendingSlotAmount(slotId, e.target.value);
        }}
      />

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        className="text-green-600 hover:text-green-700"
        disabled={!selectedProduct || !amount}
      >
        <Check className="h-4 w-4" />
      </button>

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
