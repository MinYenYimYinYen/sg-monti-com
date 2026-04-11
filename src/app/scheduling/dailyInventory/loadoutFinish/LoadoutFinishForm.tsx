import { useSelector } from "react-redux";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadoutFinishSelect } from "@/app/scheduling/dailyInventory/loadoutFinish/loadoutFinishSelect";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { loadoutSelect } from "@/app/loadout/loadoutSelect";
import { loadoutActions } from "@/app/loadout/loadoutSlice";
import { useLoadoutFinishForm } from "@/app/scheduling/dailyInventory/loadoutFinish/useLoadoutFinishForm";
import { useLoadout } from "@/app/loadout/useLoadout";
import { Container } from "@/components/Containers";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { loadoutHelper } from "@/app/scheduling/dailyInventory/components/loadoutFormHelpers";
import { EquipmentFinishSection } from "./components/EquipmentFinishSection";
import { SubProductFinishInput } from "./components/SubProductFinishInput";
import { AdditionalProductsFinishSection } from "./components/AdditionalProductsFinishSection";
import { useAppDispatch } from "@/lib/hooks/redux";
import { cn, md } from "@/style/utils";

export function LoadoutFinishForm() {
  const appDispatch = useAppDispatch();
  const router = useRouter();
  const { setShouldShowAllFinishLoadoutIssues } = useLoadoutFinishForm();
  const { upsertLoadout } = useLoadout();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const finishLoadoutDoc = useSelector(loadoutSelect.finishLoadout);
  const finishLoadout = useSelector(loadoutFinishSelect.finishLoadout.data);
  const hasIssues = useSelector(
    loadoutFinishSelect.finishLoadout.finishValidation.hasIssues,
  );
  const tech = useSelector(loadoutStartSelect.tech);
  const routeDate = useSelector(loadoutStartSelect.routeDate);
  const issues = useSelector(
    loadoutFinishSelect.finishLoadout.finishValidation.issues,
  );
  const showAllIssues = useSelector(
    loadoutFinishSelect.showAllFinishLoadoutIssues,
  );

  console.log(issues);

  const isStored = finishLoadoutDoc?.isStored ?? false;
  // truckId and rideOnId come from the persisted doc — the tech doesn't re-enter them for the finish form.
  const truckId = finishLoadoutDoc?.truckId ?? null;
  const rideOnId = finishLoadoutDoc?.rideOnId ?? null;

  const canSubmit =
    !!tech && !!routeDate && !!truckId && !isStored && !hasIssues;

  const handleSave = async () => {
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
      router.push(`/scheduling/dailyInventory/loadoutFeedback/${tech}/${routeDate}`);
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
        {finishLoadout.masters.map((master, masterIndex) => (
          <div
            key={master.productId}
            className={cn("flex flex-col gap-2 w-full bg-accent/20 rounded-lg p-2", md("p-3"))}
          >
            {/* Master Header */}
            <div className={cn("text-base font-bold text-foreground", md("text-xl"))}>
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

            {/* Sub-products attached to this master (editable finish amounts) */}
            {master.subProducts.length > 0 && (
              <div className={"flex flex-col gap-1"}>
                {master.subProducts.map((sub, subProductIndex) => (
                  <SubProductFinishInput
                    key={sub.productId}
                    masterProductId={master.productId}
                    masterIndex={masterIndex}
                    subProductIndex={subProductIndex}
                    isStored={isStored}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Additional Products (singles + custom sub-products) */}
        <AdditionalProductsFinishSection isStored={isStored} />

        {/* Empty State */}
        {finishLoadout.masters.length === 0 && (
          <div className={"text-center text-foreground/50 py-8"}>
            Loading loadout…
          </div>
        )}

        {/* Submit */}
        <div onClick={() => setShouldShowAllFinishLoadoutIssues(true)}>

          <SaveButton
            status={saveStatus}
            disabled={!canSubmit}
            onClick={handleSave}
            onSuccessComplete={() => setSaveStatus("idle")}
          >
            Save Finish Loadout
          </SaveButton>
        </div>
        {showAllIssues && Object.values(issues).length > 0 && (
          <div className={"text-center text-red-500 py-2"}>
            {Object.values(issues).map((issue, index) => (
              <div key={index} className={"text-sm"}>
                {issue}
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
