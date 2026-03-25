import { useSelector } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { aggregateLoadoutInventory } from "@/app/realGreen/customer/_lib/hooks/aggregateLoadoutInventory";
import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { Input } from "@/style/components/input";
import { PendingProductSlot } from "./PendingProductSlot";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";

type SubProductSectionProps = {
  masterProductId: number;
};

export function SubProductSection({ masterProductId }: SubProductSectionProps) {
  const { updateStartLoadout } = useLoadoutForm();

  const services = useSelector(loadoutFormSelect.services);
  const loadoutInventory = aggregateLoadoutInventory(services);
  const startLoadout = useSelector(loadoutFormSelect.startLoadout);
  const pendingSlots = useSelector(loadoutFormSelect.pendingProductSlots);

  // Find planned master
  const plannedMaster = loadoutInventory.masters.find(
    (m) => m.product.productId === masterProductId,
  );

  // Find actual master in state
  const startMaster = startLoadout.masters.find(
    (m) => m.product.productId === masterProductId,
  );

  if (!plannedMaster || plannedMaster.subProducts.length === 0) return null;

  const handleAmountChange = (productId: number, value: number | null) => {
    if (!startMaster) return;

    const updatedMasters = startLoadout.masters.map((m) => {
      if (m.product.productId === masterProductId) {
        return {
          ...m,
          subProducts: m.subProducts.map((s) => {
            if (s.product.productId === productId) {
              return { ...s, startAmount: value };
            }
            return s;
          }),
        };
      }
      return m;
    });

    updateStartLoadout({ masters: updatedMasters });
  };

  // Filter pending slots for this master
  const masterPendingSlots = pendingSlots.filter(
    (slot) => slot.masterId === masterProductId,
  );

  return (
    <div className={"flex flex-col gap-2"}>
      {plannedMaster.subProducts.map((sub) => {
        const subAmountDisplay = sub.product.unitConfigDisplay.format({
          amount: sub.plannedAmount,
          targetContexts: ["load", ],
          rounding: "none",

        }).formattedString;

        // Find corresponding subProduct in startLoadout
        const startSub = startMaster?.subProducts.find(
          (s) => s.product.productId === sub.product.productId,
        );

        // Convert app units to load units for display
        const displayValue = startSub?.startAmount != null
          ? convertQuantity(
              startSub.startAmount,
              "app",
              "load",
              sub.product.unitConfig
            )
          : "";

        return (
          <div
            key={sub.product.productId}
            className={"flex items-center justify-between gap-2 bg-accent/10 rounded px-1 py-1"}
          >
            <div>
              <div className={"flex-1 text-sm text-foreground/90"}>
                {sub.product.productCode}
              </div>
              <div className={"text-xs text-foreground/70"}>
                Planned: {subAmountDisplay}
              </div>
            </div>
            <Input
              type="number"
              placeholder={sub.product.unitConfig.conversions.load.unitLabel}
              className="w-32"
              value={displayValue}
              onChange={(e) => {
                const loadValue = e.target.value
                  ? parseFloat(e.target.value)
                  : null;
                // Convert load units to app units for storage
                const appValue = loadValue != null
                  ? convertQuantity(
                      loadValue,
                      "load",
                      "app",
                      sub.product.unitConfig
                    )
                  : null;
                handleAmountChange(sub.product.productId, appValue);
              }}
            />
          </div>
        );
      })}

      {/* Pending Slots for this Master */}
      {masterPendingSlots.map((slot) => (
        <PendingProductSlot key={slot.id} slotId={slot.id} />
      ))}
    </div>
  );
}
