import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { loadoutStartActions } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSlice";
import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";
import { useLoadout } from "@/app/loadout/useLoadout";
import { useEffect, useState } from "react";
import { MasterProductCard } from "./components/MasterProductCard";
import { AdditionalProductsSection } from "./components/AdditionalProductsSection";
import { Container } from "@/components/Containers";
import { loadoutHelper } from "@/app/scheduling/dailyInventory/components/loadoutFormHelpers";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { deepEqual } from "@/lib/primatives/typeUtils/deepEqual";
import { cn, md } from "@/style/utils";

export function LoadoutStartForm() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { updateLoadout } = useLoadoutStartForm();
  const { upsertLoadout } = useLoadout();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const services = useSelector(loadoutStartSelect.services);
  const loadoutInventory = useSelector(loadoutStartSelect.serviceResolvedLoadout);
  const loadout = useSelector(loadoutStartSelect.loadout.data);
  const hasIssues = useSelector(loadoutStartSelect.loadout.startValidation.hasIssues);
  const tech = useSelector(loadoutStartSelect.tech);
  const routeDate = useSelector(loadoutStartSelect.routeDate);
  const truckId = useSelector(loadoutStartSelect.truckId);
  const rideOnId = useSelector(loadoutStartSelect.rideOnId);

  // Initialize (or re-initialize) the loadout whenever the inventory structure changes.
  // This handles both the initial load and package selection changes, which alter which
  // equipment entries are present.
  useEffect(() => {
    if (loadoutInventory.masters.length === 0) return;

    const inventoryStructure = loadoutInventory.masters.map((m) => ({
      productId: m.product.productId,
      equipmentIds: m.equipments.map((e) => e.equipmentId),
    }));
    const loadoutStructure = loadout.masters.map((m) => ({
      productId: m.productId,
      equipmentIds: m.equipments.map((e) => e.equipmentId),
    }));

    if (!deepEqual(inventoryStructure, loadoutStructure)) {
      updateLoadout(loadoutHelper.initializeLoadout(loadoutInventory));
    }
  }, [loadoutInventory, loadout, updateLoadout]);

  const canSubmit = !!tech && !!routeDate && !!truckId && !hasIssues;


  const handleSave = async () => {
    if (hasIssues) {
      dispatch(loadoutStartActions.setShouldShowAllStartLoadoutIssues(true));
      return;
    }

    if (!tech || !routeDate || !truckId) return;

    setSaveStatus("saving");

    const loadoutDoc = loadoutHelper.serializeLoadout({
      loadout,
      employeeId: tech,
      routeDate,
      truckId,
      rideOnId: rideOnId ?? "",
      isStored: false,
    });

    const success = await upsertLoadout(loadoutDoc);
    if (success) {
      dispatch(loadoutStartActions.clearStartForm());
      router.push("/scheduling/dailyInventory");
    }
    setSaveStatus(success ? "success" : "idle");
  };

  if (!services.length) return <div className={"text-center text-foreground/50 py-8"}>
    <div>No route found. </div>
  </div>;

  return (
    <Container variant={"page"} className={cn("px-2 py-2", md("px-4 py-8"))}>
      <div className={cn("flex flex-col gap-2 max-w-xl overflow-hidden", md("gap-3"))}>
        {/* Master Product Cards */}
        {loadoutInventory.masters.map((master) => (
          <MasterProductCard
            key={master.product.productId}
            masterProductId={master.product.productId}
          />
        ))}

        {/* Additional Products Section */}
        <AdditionalProductsSection />

        {/* Empty State */}
        {loadoutInventory.masters.length === 0 && (
          <div className={"text-center text-foreground/50 py-8"}>
            No products planned for selected services
          </div>
        )}

        {/* Submit */}
        {loadoutInventory.masters.length > 0 && (
          <div onClick={() => dispatch(loadoutStartActions.setShouldShowAllStartLoadoutIssues(true))}>
            <SaveButton
              status={saveStatus}
              disabled={!canSubmit}
              onClick={handleSave}
              onSuccessComplete={() => setSaveStatus("idle")}
            >
              Save Start Loadout
            </SaveButton>
          </div>
        )}
      </div>
    </Container>
  );
}
