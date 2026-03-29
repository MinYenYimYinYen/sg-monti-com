"use client";

import { useSelector, useDispatch } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { loadoutFormActions } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSlice";
import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { Input } from "@/style/components/input";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { getFieldPath } from "@/lib/validation/getFieldPath";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";

type EquipmentFinishSectionProps = {
  masterProductId: number;
  equipmentId: string;
  isStored: boolean;
};

export function EquipmentFinishSection({
  masterProductId,
  equipmentId,
  isStored,
}: EquipmentFinishSectionProps) {
  const dispatch = useDispatch();
  const { updateFinishLoadout } = useLoadoutForm();

  const finishLoadout = useSelector(loadoutFormSelect.finishLoadout.data);

  const finishMaster = finishLoadout.masters.find(
    (m) => m.product.productId === masterProductId,
  );
  const finishEntry = finishMaster?.equipments.find(
    (e) => e.equipmentId === equipmentId,
  );

  const masterIndex = finishLoadout.masters.findIndex(
    (m) => m.product.productId === masterProductId,
  );
  const entryIndex =
    finishMaster?.equipments.findIndex(
      (e) => e.equipmentId === equipmentId,
    ) ?? -1;

  const fieldPath = getFieldPath<LoadoutBase>()
    .field("masters")
    .index(masterIndex)
    .field("equipments")
    .index(entryIndex)
    .field("finishAmount")
    .toString();

  const shouldShow = useSelector(
    loadoutFormSelect.finishLoadout.finishValidation.shouldShowFieldIssue(fieldPath),
  );
  const allIssues = useSelector(
    loadoutFormSelect.finishLoadout.finishValidation.issues,
  );
  const fieldIssue = shouldShow ? allIssues[fieldPath] : undefined;

  if (!finishEntry) return null;

  const tracksTankLevel = finishEntry.appMethod.tracksTankLevel;

  const showFlOz =
    finishEntry.mixProduct.unitConfig.conversions.app.unitLabel === "Fl Oz";

  const startAmountDisplay =
    finishEntry.startAmount != null
      ? finishEntry.mixProduct.unitConfigDisplay.format({
          amount: finishEntry.startAmount,
          targetContexts: showFlOz ? ["load", "app"] : ["load"],
          rounding: "ceil",
        }).formattedString
      : "—";

  const handleFinishAmountChange = (value: number | null) => {
    if (!finishMaster) return;

    const updatedMasters = finishLoadout.masters.map((m) => {
      if (m.product.productId === masterProductId) {
        return {
          ...m,
          equipments: m.equipments.map((e) => {
            if (e.equipmentId === equipmentId) {
              // Derive sub-product finish amounts proportionally from the finish tank level.
              const ratio =
                value != null && finishEntry.startAmount != null && finishEntry.startAmount > 0
                  ? value / finishEntry.startAmount
                  : null;

              return {
                ...e,
                finishAmount: value,
                subProducts: e.subProducts.map((sub) => ({
                  ...sub,
                  finishAmount:
                    ratio != null && sub.startAmount != null
                      ? Math.round(ratio * sub.startAmount * 100) / 100
                      : null,
                })),
              };
            }
            return e;
          }),
        };
      }
      return m;
    });

    updateFinishLoadout({ masters: updatedMasters });
  };

  const displayValue =
    finishEntry.finishAmount != null
      ? convertQuantity(
          finishEntry.finishAmount,
          "app",
          "load",
          finishEntry.mixProduct.unitConfig,
        )
      : "";

  return (
    <div className={"flex flex-col gap-2 bg-accent/30 rounded-sm p-1"}>
      <div className={"flex items-center justify-between gap-2"}>
        <div>
          <div className={"flex-1 text-foreground/90"}>
            {finishEntry.appMethod.needsWater ? equipmentId : finishEntry.mixProduct.productCode}
          </div>
          <div className={"text-xs text-foreground/70"}>
            Start: {startAmountDisplay}
          </div>
        </div>
        {tracksTankLevel && (
          <div className="flex flex-col items-end">
            <Input
              type="number"
              placeholder={
                finishEntry.mixProduct.unitConfig.conversions.load.unitLabel
              }
              className={`w-32 ${fieldIssue ? "border-red-500" : ""}`}
              value={displayValue}
              disabled={isStored}
              onChange={(e) => {
                const loadValue = e.target.value
                  ? parseFloat(e.target.value)
                  : null;
                const appValue =
                  loadValue != null
                    ? convertQuantity(
                        loadValue,
                        "load",
                        "app",
                        finishEntry.mixProduct.unitConfig,
                      )
                    : null;
                handleFinishAmountChange(appValue);
              }}
              onBlur={() => {
                dispatch(
                  loadoutFormActions.markFinishLoadoutFieldTouched(fieldPath),
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
