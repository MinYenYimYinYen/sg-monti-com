"use client";

import { useSelector, useDispatch } from "react-redux";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { loadoutStartActions } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSlice";
import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";
import { Input } from "@/style/components/input";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { getFieldPath } from "@/lib/validation/getFieldPath";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { MixWizard } from "@/app/scheduling/dailyInventory/components/mixWizard/MixWizard";

type AppMethodSectionProps = {
  masterProductId: number;
  equipmentId: string;
};

export function EquipmentSection({
  masterProductId,
  equipmentId,
}: AppMethodSectionProps) {
  const dispatch = useDispatch();
  const { updateLoadout } = useLoadoutStartForm();

  const loadoutInventory = useSelector(
    loadoutStartSelect.serviceResolvedLoadout,
  );
  const loadout = useSelector(loadoutStartSelect.loadout.data);

  // Dual-tree lookups: equipmentId is passed as a prop (not the object) so React's key-based
  // reconciliation works correctly. We look up from two separate trees:
  //   - plannedEquipment: from the inventory selector (display/planned data)
  //   - startEntry: from the loadout state (editable amounts)
  // masterIndex and entryIndex are derived from the loadout state for index-based field paths
  // used by the validation system.
  const plannedMaster = loadoutInventory.masters.find(
    (m) => m.product.productId === masterProductId,
  );
  const plannedEquipment = plannedMaster?.equipments.find(
    (e) => e.equipmentId === equipmentId,
  );

  const startMaster = loadout.masters.find(
    (m) => m.product.productId === masterProductId,
  );
  const startEntry = startMaster?.equipments.find(
    (e) => e.equipmentId === equipmentId,
  );

  const masterIndex = loadout.masters.findIndex(
    (m) => m.product.productId === masterProductId,
  );
  const entryIndex =
    startMaster?.equipments.findIndex(
      (e) => e.equipmentId === equipmentId,
    ) ?? -1;

  const fieldPath = getFieldPath<LoadoutBase>()
    .field("masters")
    .index(masterIndex)
    .field("equipments")
    .index(entryIndex)
    .field("startAmount")
    .toString();

  // Use proper validation selectors that respect touched state
  const shouldShow = useSelector(
    loadoutStartSelect.loadout.startValidation.shouldShowFieldIssue(fieldPath),
  );
  const allIssues = useSelector(
    loadoutStartSelect.loadout.startValidation.issues,
  );
  const fieldIssue = shouldShow ? allIssues[fieldPath] : undefined;

  if (!plannedEquipment) return null;

  const tracksTankLevel = plannedEquipment.appMethod.tracksTankLevel;

  // The carrier is always constituents[0] (WATER_PRODUCT_ID).
  const carrierConstituent = plannedEquipment.constituents[0];

  // showFlOz is encoded in the carrier's unitConfig: app = "Fl Oz" means showFlOz: true.
  // When true, display as compound "X Gal Y Fl Oz"; when false, display as decimal gallons.
  const showFlOz =
    carrierConstituent.product.unitConfig.conversions.app.unitLabel === "Fl Oz";

  // Use plannedMixture.totalPlannedAmount for the "Planned:" display — this is the total
  // mix volume (water + solutes) in the carrier's app unit, the source of truth.
  const carrierProductAmountDisplay =
    carrierConstituent.product.unitConfigDisplay.format({
      amount: plannedEquipment.plannedMixture.totalPlannedAmount,
      targetContexts: showFlOz ? ["load", "app"] : ["load"],
      rounding: "ceil",
    }).formattedString;

  const handleAmountChange = (value: number | null) => {
    if (!startMaster) return;

    const updatedMasters = loadout.masters.map((m) => {
      if (m.product.productId === masterProductId) {
        return {
          ...m,
          equipments: m.equipments.map((e) => {
            if (e.equipmentId === equipmentId) {
              // Derive constituent start amounts proportionally from the tank level.
              // ratio = entered tank amount / planned tank amount (both in app units).
              const ratio =
                value != null && plannedEquipment.plannedAmount > 0
                  ? value / plannedEquipment.plannedAmount
                  : null;

              return {
                ...e,
                startAmount: value,
                constituents: e.constituents.map((constituent) => ({
                  ...constituent,
                  startAmount:
                    ratio != null
                      ? Math.round(ratio * constituent.plannedAmount * 100) / 100
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

    updateLoadout({ masters: updatedMasters });
  };

  // Convert app units to load units for display
  const displayValue =
    startEntry?.startAmount != null
      ? convertQuantity(
          startEntry.startAmount,
          "app",
          "load",
          carrierConstituent.product.unitConfig,
        )
      : "";

  return (
    <div className={"flex flex-col gap-2 bg-accent/30 rounded-sm p-1"}>
      {/* Carrier product row with Input */}
      <div className={"flex items-center justify-between gap-2"}>
        <div>
          <div className={"flex-1 text-foreground/90"}>
            {tracksTankLevel && plannedEquipment.appMethod.needsWater ? (
              <MixWizard
                plannedEquipment={plannedEquipment}
                masterProductId={masterProductId}
              >
                {equipmentId}
              </MixWizard>
            ) : (
              plannedEquipment.appMethod.needsWater
                ? equipmentId
                : carrierConstituent.product.productCode  // eslint-disable-line @typescript-eslint/no-unnecessary-condition
            )}
          </div>
          <div className={"text-xs text-foreground/70"}>
            Planned: {carrierProductAmountDisplay}
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
                        carrierConstituent.product.unitConfig,
                      )
                    : null;
                handleAmountChange(appValue);
              }}
              onBlur={() => {
                dispatch(
                  loadoutStartActions.markStartLoadoutFieldTouched(fieldPath),
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
