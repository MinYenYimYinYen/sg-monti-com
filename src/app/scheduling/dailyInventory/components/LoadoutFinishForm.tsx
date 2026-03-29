import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { loadoutSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutSelect";
import { loadoutActions } from "@/app/scheduling/dailyInventory/_lib/loadoutSlice";
import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { useLoadout } from "@/app/scheduling/dailyInventory/_lib/useLoadout";
import { Container } from "@/components/Containers";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { loadoutHelper } from "@/app/scheduling/dailyInventory/components/loadoutFormHelpers";
import { EquipmentFinishSection } from "./masterProductCard/equipmentSection/EquipmentFinishSection";
import { useAppDispatch } from "@/lib/hooks/redux";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { appMethodSelect } from "@/app/appMethod/appMethodSelect";
import { equipmentSelect } from "@/app/equipment/equipmentSelect";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { baseProductMaster } from "@/app/realGreen/product/_lib/baseProduct";

export function LoadoutFinishForm() {
  const appDispatch = useAppDispatch();
  const { updateFinishLoadout, setShouldShowAllFinishLoadoutIssues, clearFinishLoadoutForm } = useLoadoutForm();
  const { upsertLoadout } = useLoadout();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const finishLoadoutDoc = useSelector(loadoutSelect.finishLoadout);
  const finishLoadout = useSelector(loadoutFormSelect.finishLoadout.data);
  const hasIssues = useSelector(loadoutFormSelect.finishLoadout.finishValidation.hasIssues);
  const tech = useSelector(loadoutFormSelect.tech);
  const routeDate = useSelector(loadoutFormSelect.routeDate);
  const truckId = useSelector(loadoutFormSelect.truckId);
  const rideOnId = useSelector(loadoutFormSelect.rideOnId);

  const appMethodMap = useSelector(appMethodSelect.appMethodMap);
  const equipmentMap = useSelector(equipmentSelect.equipmentMap);
  const productMastersMap = useSelector(productSelect.productMastersMap);
  const productSubsMap = useSelector(productSelect.productSubsMap);

  const isStored = finishLoadoutDoc?.isStored ?? false;

  // Hydrate finishLoadout in Redux from the persisted LoadoutDoc when it changes.
  // This converts the ID-only LoadoutDoc into a full LoadoutBase with hydrated product objects.
  useEffect(() => {
    if (!finishLoadoutDoc) return;

    const hydratedLoadout: LoadoutBase = {
      masters: finishLoadoutDoc.masters.map((masterDoc) => {
        const masterProduct = productMastersMap.get(masterDoc.productId) ?? baseProductMaster;

        return {
          productId: masterDoc.productId,
          product: masterProduct,
          plannedAmount: masterDoc.plannedAmount,
          startAmount: masterDoc.startAmount,
          finishAmount: masterDoc.finishAmount,
          unitId: masterDoc.unitId,
          unit: masterProduct.unit,
          equipments: masterDoc.equipments.map((eDoc) => {
            const equipment = equipmentMap.get(eDoc.equipmentId);
            const appMethod = equipment
              ? appMethodMap.get(equipment.defaultAppMethodId)
              : undefined;
            const mixProduct = productSubsMap.get(eDoc.mixProductId);

            // Fall back to first equipment's appMethod if not found
            const resolvedAppMethod = appMethod ?? masterProduct.equipmentPackages[0]?.equipments[0]?.appMethod;

            return {
              equipmentId: eDoc.equipmentId,
              appMethod: resolvedAppMethod!,
              mixProductId: eDoc.mixProductId,
              mixProduct: mixProduct!,
              mixProductUnitId: eDoc.mixProductUnitId,
              mixProductUnit: mixProduct?.unit ?? masterProduct.unit,
              plannedAmount: eDoc.plannedAmount,
              startAmount: eDoc.startAmount,
              finishAmount: eDoc.finishAmount,
              subProducts: eDoc.subProducts.map((sDoc) => {
                const sub = productSubsMap.get(sDoc.productId);
                return {
                  productId: sDoc.productId,
                  product: sub!,
                  plannedAmount: sDoc.plannedAmount,
                  startAmount: sDoc.startAmount,
                  finishAmount: sDoc.finishAmount,
                  unitId: sDoc.unitId,
                  unit: sub?.unit ?? masterProduct.unit,
                };
              }),
            };
          }),
          subProducts: masterDoc.subProducts.map((sDoc) => {
            const sub = productSubsMap.get(sDoc.productId);
            return {
              productId: sDoc.productId,
              product: sub!,
              plannedAmount: sDoc.plannedAmount,
              startAmount: sDoc.startAmount,
              finishAmount: sDoc.finishAmount,
              unitId: sDoc.unitId,
              unit: sub?.unit ?? masterProduct.unit,
            };
          }),
        };
      }),
      singles: finishLoadoutDoc.singles.map((sDoc) => {
        const single = productSubsMap.get(sDoc.productId);
        return {
          productId: sDoc.productId,
          product: single as any,
          unitId: sDoc.unitId,
          unit: single?.unit ?? { unitId: sDoc.unitId, desc: "", metric: "" } as any,
          startAmount: sDoc.startAmount,
          finishAmount: sDoc.finishAmount,
        };
      }),
      subProducts: finishLoadoutDoc.subProducts.map((sDoc) => {
        const sub = productSubsMap.get(sDoc.productId);
        return {
          productId: sDoc.productId,
          product: sub!,
          unitId: sDoc.unitId,
          unit: sub?.unit ?? { unitId: sDoc.unitId, desc: "", metric: "" } as any,
          startAmount: sDoc.startAmount,
          finishAmount: sDoc.finishAmount,
        };
      }),
    };

    updateFinishLoadout(hydratedLoadout);
  }, [finishLoadoutDoc, productMastersMap, productSubsMap, equipmentMap, appMethodMap, updateFinishLoadout]);

  const canSubmit = !!tech && !!routeDate && !!truckId && !isStored;

  const handleSave = async () => {
    if (hasIssues) {
      setShouldShowAllFinishLoadoutIssues(true);
      return;
    }

    if (!tech || !routeDate || !truckId || !finishLoadoutDoc) return;

    setSaveStatus("saving");

    const loadoutDoc = loadoutHelper.serializeLoadout({
      loadout: finishLoadout,
      employeeId: tech,
      routeDate,
      truckId,
      rideOnId: rideOnId ?? "",
      isStored: true,
    });

    const success = await upsertLoadout(loadoutDoc);
    if (success) {
      setSaveStatus("success");
      clearFinishLoadoutForm();
      appDispatch(loadoutActions.clearFinishLoadout());
    } else {
      setSaveStatus("idle");
    }
  };

  if (!finishLoadoutDoc) return null;

  return (
    <Container variant={"page"}>
      <div className={"flex flex-col gap-3 max-w-xl"}>
        {isStored && (
          <div className="text-sm text-muted-foreground bg-accent/20 rounded-md px-3 py-2">
            This loadout has already been submitted and is read-only.
          </div>
        )}

        {/* Master Product Cards */}
        {finishLoadout.masters.map((master) => (
          <div
            key={master.productId}
            className={"flex flex-col gap-2 w-full bg-accent/20 rounded-lg p-3"}
          >
            {/* Master Header */}
            <div className={"text-xl font-bold text-foreground"}>
              {master.product.description}
            </div>

            {/* Equipment Entries */}
            {master.equipments.map((equipment) => (
              <EquipmentFinishSection
                key={equipment.equipmentId}
                masterProductId={master.productId}
                equipmentId={equipment.equipmentId}
                isStored={isStored}
              />
            ))}

            {/* Non-equipment sub-products (read-only display) */}
            {master.subProducts.length > 0 && (
              <div className={"flex flex-col gap-1"}>
                {master.subProducts.map((sub) => (
                  <div
                    key={sub.productId}
                    className={"flex items-center justify-between gap-2 bg-accent/10 rounded px-1 py-1"}
                  >
                    <div>
                      <div className={"text-sm text-foreground/90"}>
                        {sub.product.productCode}
                      </div>
                      <div className={"text-xs text-foreground/70"}>
                        Start:{" "}
                        {sub.startAmount != null
                          ? sub.product.unitConfigDisplay.format({
                              amount: sub.startAmount,
                              targetContexts: ["load"],
                              rounding: "none",
                            }).formattedString
                          : "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Empty State */}
        {finishLoadout.masters.length === 0 && (
          <div className={"text-center text-foreground/50 py-8"}>
            Loading loadout…
          </div>
        )}

        {/* Submit */}
        {finishLoadout.masters.length > 0 && (
          <SaveButton
            status={saveStatus}
            disabled={!canSubmit}
            onClick={handleSave}
            onSuccessComplete={() => setSaveStatus("idle")}
          >
            Save Finish Loadout
          </SaveButton>
        )}
      </div>
    </Container>
  );
}
