import { useSelector } from "react-redux";
import { useState } from "react";
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

export function LoadoutFinishForm() {
  const appDispatch = useAppDispatch();
  const { setShouldShowAllFinishLoadoutIssues } = useLoadoutForm();
  const { upsertLoadout } = useLoadout();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const finishLoadoutDoc = useSelector(loadoutSelect.finishLoadout);
  const finishLoadout = useSelector(loadoutFormSelect.finishLoadout.data);
  const hasIssues = useSelector(loadoutFormSelect.finishLoadout.finishValidation.hasIssues);
  const tech = useSelector(loadoutFormSelect.tech);
  const routeDate = useSelector(loadoutFormSelect.routeDate);

  const isStored = finishLoadoutDoc?.isStored ?? false;
  // truckId and rideOnId come from the persisted doc — the tech doesn't re-enter them for the finish form.
  const truckId = finishLoadoutDoc?.truckId ?? null;
  const rideOnId = finishLoadoutDoc?.rideOnId ?? null;

  const canSubmit = !!tech && !!routeDate && !!truckId && !isStored && !hasIssues;

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
