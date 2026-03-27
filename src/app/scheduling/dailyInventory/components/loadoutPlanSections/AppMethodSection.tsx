"use client";

import { useSelector, useDispatch } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { loadoutFormActions } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSlice";
import { aggregateLoadoutInventory } from "@/app/scheduling/dailyInventory/_lib/aggregateLoadoutInventory";
import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { Input } from "@/style/components/input";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { getFieldPath } from "@/lib/validation/getFieldPath";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";

type AppMethodSectionProps = {
  masterProductId: number;
  equipmentId: string;
};

export function AppMethodSection({
  masterProductId,
  equipmentId,
}: AppMethodSectionProps) {
  const dispatch = useDispatch();
  const { updateLoadout } = useLoadoutForm();

  const services = useSelector(loadoutFormSelect.services);
  const loadoutInventory = aggregateLoadoutInventory(services);
  const loadout = useSelector(loadoutFormSelect.loadout.data);

  // Find planned master and equipment entry
  const plannedMaster = loadoutInventory.masters.find(
    (m) => m.product.productId === masterProductId,
  );
  const plannedEntry = plannedMaster?.equipmentEntries.find(
    (e) => e.equipmentId === equipmentId,
  );

  // Find actual master and equipment entry in state
  const startMaster = loadout.masters.find(
    (m) => m.product.productId === masterProductId,
  );
  const startEntry = startMaster?.equipmentEntries.find(
    (e) => e.equipmentId === equipmentId,
  );

  // Build field path for validation
  const masterIndex = loadout.masters.findIndex(
    (m) => m.product.productId === masterProductId,
  );
  const entryIndex =
    startMaster?.equipmentEntries.findIndex(
      (e) => e.equipmentId === equipmentId,
    ) ?? -1;

  const fieldPath = getFieldPath<LoadoutBase>()
    .field("masters")
    .index(masterIndex)
    .field("equipmentEntries")
    .index(entryIndex)
    .field("startAmount")
    .toString();

  // Use proper validation selectors that respect touched state
  const shouldShow = useSelector(
    loadoutFormSelect.loadout.startValidation.shouldShowFieldIssue(fieldPath),
  );
  const allIssues = useSelector(loadoutFormSelect.loadout.startValidation.issues);
  const fieldIssue = shouldShow ? allIssues[fieldPath] : undefined;

  if (!plannedEntry) return null;

  // Non-tank equipment (backpack, hose) doesn't need start/finish amount input
  const tracksTankLevel = plannedEntry.appMethod.tracksTankLevel;

  const mixProductAmountDisplay =
    plannedEntry.mixProduct.unitConfigDisplay.format({
      amount: plannedEntry.plannedAmount,
      targetContexts: ["load"],
      rounding: "ceil",
    }).formattedString;

  const handleAmountChange = (value: number | null) => {
    if (!startMaster) return;

    const updatedMasters = loadout.masters.map((m) => {
      if (m.product.productId === masterProductId) {
        return {
          ...m,
          equipmentEntries: m.equipmentEntries.map((e) => {
            if (e.equipmentId === equipmentId) {
              return { ...e, startAmount: value };
            }
            return e;
          }),
        };
      }
      return m;
    });

    updateLoadout({ masters: updatedMasters });
  };

  // Convert app units to load units for display
  const displayValue =
    startEntry?.startAmount != null
      ? convertQuantity(
          startEntry.startAmount,
          "app",
          "load",
          plannedEntry.mixProduct.unitConfig,
        )
      : "";

  return (
    <div className={"flex flex-col gap-2 bg-accent/30 rounded-sm p-1"}>
      {/* MixProduct with Input */}
      <div className={"flex items-center justify-between gap-2"}>
        <div>
        <div className={"flex-1 text-foreground/90"}>
            {plannedEntry.appMethod.needsWater ? equipmentId : plannedEntry.mixProduct.productCode}
          </div>
          <div className={"text-xs text-foreground/70"}>
            Planned: {mixProductAmountDisplay}
          </div>
        </div>
        {tracksTankLevel && (
          <div className="flex flex-col items-end">
            <Input
              type="number"
              placeholder={
                plannedEntry.mixProduct.unitConfig.conversions.load.unitLabel
              }
              className={`w-32 ${fieldIssue ? "border-red-500" : ""}`}
              value={displayValue}
              onChange={(e) => {
                const loadValue = e.target.value
                  ? parseFloat(e.target.value)
                  : null;
                // Convert load units to app units for storage
                const appValue =
                  loadValue != null
                    ? convertQuantity(
                        loadValue,
                        "load",
                        "app",
                        plannedEntry.mixProduct.unitConfig,
                      )
                    : null;
                handleAmountChange(appValue);
              }}
              onBlur={() => {
                dispatch(
                  loadoutFormActions.markStartLoadoutFieldTouched(fieldPath),
                );
              }}
            />
            {fieldIssue && (
              <span className="text-red-500 text-xs mt-1">{fieldIssue}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
