import { useSelector } from "react-redux";
import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";
import { useTechRoute } from "@/app/scheduling/techRoute/useTechRoute";
import { Input } from "@/style/components/input";
import { Plus, X } from "lucide-react";
import { PendingProductSlot } from "./PendingProductSlot";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";

export function AdditionalProductsSection() {
  const { updateStartLoadout, removeProductFromLoadout, addPendingProductSlot } =
    useTechRoute();

  const startLoadout = useSelector(techRouteSelect.startLoadout);
  const pendingSlots = useSelector(techRouteSelect.pendingProductSlots);

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
      {startLoadout.singles.map((single) => {
        // Convert app units to load units for display
        const displayValue = single.startAmount != null
          ? convertQuantity(
              single.startAmount,
              "app",
              "load",
              single.product.unitConfig
            )
          : "";

        return (
          <div
            key={single.product.productId}
            className={"flex items-center gap-2 bg-accent/10 rounded px-2 py-1"}
          >
            <div className={"flex-1 text-sm text-foreground/90"}>
              {single.product.description}
            </div>
            <Input
              type="number"
              placeholder="Start amount"
              className="w-24"
              value={displayValue}
              onChange={(e) => {
                const loadValue = e.target.value ? parseFloat(e.target.value) : null;
                // Convert load units to app units for storage
                const appValue = loadValue != null
                  ? convertQuantity(
                      loadValue,
                      "load",
                      "app",
                      single.product.unitConfig
                    )
                  : 0;
                const updatedSingles = startLoadout.singles.map((s) => {
                  if (s.product.productId === single.product.productId) {
                    return { ...s, startAmount: appValue };
                  }
                  return s;
                });
                updateStartLoadout({ singles: updatedSingles });
              }}
            />
            <button
              onClick={() =>
                removeProductFromLoadout(single.product.productId)
              }
              className="text-destructive hover:text-destructive/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}

      {/* SubProducts */}
      {startLoadout.subProducts.map((sub) => {
        // Convert app units to load units for display
        const displayValue = sub.startAmount != null
          ? convertQuantity(
              sub.startAmount,
              "app",
              "load",
              sub.product.unitConfig
            )
          : "";

        return (
          <div
            key={sub.product.productId}
            className={"flex items-center gap-2 bg-accent/10 rounded px-2 py-1"}
          >
            <div className={"flex-1 text-sm text-foreground/90"}>
              {sub.product.description}
            </div>
            <Input
              type="number"
              placeholder="Start amount"
              className="w-24"
              value={displayValue}
              onChange={(e) => {
                const loadValue = e.target.value ? parseFloat(e.target.value) : null;
                // Convert load units to app units for storage
                const appValue = loadValue != null
                  ? convertQuantity(
                      loadValue,
                      "load",
                      "app",
                      sub.product.unitConfig
                    )
                  : 0;
                const updatedSubProducts = startLoadout.subProducts.map((s) => {
                  if (s.product.productId === sub.product.productId) {
                    return { ...s, startAmount: appValue };
                  }
                  return s;
                });
                updateStartLoadout({ subProducts: updatedSubProducts });
              }}
            />
            <button
              onClick={() =>
                removeProductFromLoadout(sub.product.productId)
              }
              className="text-destructive hover:text-destructive/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}

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
