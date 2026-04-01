"use client";

import { useSelector, useDispatch } from "react-redux";
import { loadoutFinishSelect } from "@/app/scheduling/dailyInventory/loadoutFinish/loadoutFinishSelect";
import { loadoutFinishActions } from "@/app/scheduling/dailyInventory/loadoutFinish/loadoutFinishSlice";
import { loadoutActions } from "@/app/scheduling/dailyInventory/_lib/loadoutSlice";
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

  const finishLoadout = useSelector(loadoutFinishSelect.finishLoadout.data);

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
    loadoutFinishSelect.finishLoadout.finishValidation.shouldShowFieldIssue(fieldPath),
  );
  const allIssues = useSelector(
    loadoutFinishSelect.finishLoadout.finishValidation.issues,
  );
  const fieldIssue = shouldShow ? allIssues[fieldPath] : undefined;

  if (!finishEntry) return null;

  const tracksTankLevel = finishEntry.appMethod.tracksTankLevel;

  // The carrier is always constituents[0].
  const carrierConstituent = finishEntry.constituents[0];

  const startAmountDisplay =
    finishEntry.startAmount != null
      ? carrierConstituent.product.unitConfigDisplay.format({
          amount: finishEntry.startAmount,
          targetContexts: ["load"],
          rounding: "ceil",
        }).formattedString
      : "—";

  const handleFinishAmountChange = (value: number | null) => {
    // Derive constituent finish amounts proportionally from the finish tank level.
    const ratio =
      value != null && finishEntry.startAmount != null && finishEntry.startAmount > 0
        ? value / finishEntry.startAmount
        : null;

    dispatch(
      loadoutActions.updateFinishLoadoutEquipmentAmount({
        masterProductId,
        equipmentId,
        field: "finishAmount",
        value,
      }),
    );

    // Propagate proportional finish amounts to all constituents.
    finishEntry.constituents.forEach((constituent) => {
      const constituentFinish =
        ratio != null && constituent.startAmount != null
          ? Math.round(ratio * constituent.startAmount * 100) / 100
          : null;
      dispatch(
        loadoutActions.updateFinishLoadoutEquipmentConstituentAmount({
          masterProductId,
          equipmentId,
          constituentProductId: constituent.product.productId,
          field: "finishAmount",
          value: constituentFinish,
        }),
      );
    });
  };

  const displayValue =
    finishEntry.finishAmount != null
      ? convertQuantity(
          finishEntry.finishAmount,
          "app",
          "load",
          carrierConstituent.product.unitConfig,
        )
      : "";

  return (
    <div className={"flex flex-col gap-2 bg-accent/30 rounded-sm p-1"}>
      <div className={"flex items-center justify-between gap-2"}>
        <div>
          <div className={"flex-1 text-foreground/90"}>
            {finishEntry.appMethod.needsWater ? equipmentId : carrierConstituent.product.productCode}
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
                carrierConstituent.product.unitConfig.conversions.load.unitLabel
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
                        carrierConstituent.product.unitConfig,
                      )
                    : null;
                handleFinishAmountChange(appValue);
              }}
              onBlur={() => {
                dispatch(
                  loadoutFinishActions.markFinishLoadoutFieldTouched(fieldPath),
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
