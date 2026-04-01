"use client";

import { useSelector, useDispatch } from "react-redux";
import { useState } from "react";
import { loadoutFinishSelect } from "@/app/scheduling/dailyInventory/loadoutFinish/loadoutFinishSelect";
import { loadoutFinishActions } from "@/app/scheduling/dailyInventory/loadoutFinish/loadoutFinishSlice";
import { loadoutActions } from "@/app/scheduling/dailyInventory/_lib/loadoutSlice";
import { Input } from "@/style/components/input";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { getFieldPath } from "@/lib/validation/getFieldPath";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { cn, md } from "@/style/utils";

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

  // The carrier is always constituents[0].
  const carrierConstituent = finishEntry?.constituents[0];

  // Local string state intermediates between the user's raw input and the Redux number.
  // Initialized from the persisted finish amount (converted to load units for display).
  const initialDisplayValue =
    finishEntry?.finishAmount != null && carrierConstituent
      ? String(
          convertQuantity(
            finishEntry.finishAmount,
            "app",
            "load",
            carrierConstituent.product.unitConfig,
          ),
        )
      : "";

  const [inputValue, setInputValue] = useState(initialDisplayValue);

  if (!finishEntry || !carrierConstituent) return null;

  const tracksTankLevel = finishEntry.appMethod.tracksTankLevel;

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
              inputMode="decimal"
              placeholder={
                carrierConstituent.product.unitConfig.conversions.load.unitLabel
              }
              className={cn("w-20", md("w-32"), fieldIssue ? "border-red-500" : "")}
              value={inputValue}
              disabled={isStored}
              onChange={(e) => {
                setInputValue(e.target.value);
              }}
              onBlur={() => {
                const loadValue = inputValue ? parseFloat(inputValue) : null;
                const appValue =
                  loadValue != null && !isNaN(loadValue)
                    ? convertQuantity(
                        loadValue,
                        "load",
                        "app",
                        carrierConstituent.product.unitConfig,
                      )
                    : null;
                handleFinishAmountChange(appValue);
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
