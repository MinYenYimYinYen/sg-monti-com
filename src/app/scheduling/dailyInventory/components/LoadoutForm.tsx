import { useSelector, useDispatch } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { loadoutFormActions } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSlice";
import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { useLoadout } from "@/app/scheduling/dailyInventory/_lib/useLoadout";
import { useEffect, useState } from "react";
import { MasterProductCard } from "./masterProductCard/MasterProductCard";
import { AdditionalProductsSection } from "./additionalProductsSection/AdditionalProductsSection";
import { Container } from "@/components/Containers";
import { loadoutHelper } from "@/app/scheduling/dailyInventory/components/loadoutFormHelpers";
import { SaveButton, SaveStatus } from "@/components/SaveButton";

export function LoadoutForm() {
  const dispatch = useDispatch();
  const { updateLoadout } = useLoadoutForm();
  const { upsertLoadout } = useLoadout();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const services = useSelector(loadoutFormSelect.services);
  const loadoutInventory = useSelector(loadoutFormSelect.serviceResolvedLoadout);
  const loadout = useSelector(loadoutFormSelect.loadout.data);
  const hasIssues = useSelector(loadoutFormSelect.loadout.startValidation.hasIssues);
  const tech = useSelector(loadoutFormSelect.tech);
  const routeDate = useSelector(loadoutFormSelect.routeDate);
  const truckId = useSelector(loadoutFormSelect.truckId);
  const rideOnId = useSelector(loadoutFormSelect.rideOnId);

  // Initialize startLoadout with structure from loadoutInventory
  useEffect(() => {
    if (
      loadoutInventory.masters.length > 0 &&
      loadout.masters.length === 0
    ) {
      const initializedLoadout =
        loadoutHelper.initializeLoadout(loadoutInventory);
      updateLoadout(initializedLoadout);
    }
  }, [loadoutInventory, loadout.masters.length, loadout, updateLoadout]);

  const canSubmit = !!tech && !!routeDate && !!truckId;

  const handleSave = async () => {
    if (hasIssues) {
      dispatch(loadoutFormActions.setShouldShowAllStartLoadoutIssues(true));

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
    setSaveStatus(success ? "success" : "idle");
  };

  if (!services.length) return <div className={"text-center text-foreground/50 py-8"}>
    <div>No route found. </div>
  </div>

  return (
    <Container variant={"page"}>
      <div className={"flex flex-col gap-3 max-w-xl"}>
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
          <SaveButton
            status={saveStatus}
            disabled={!canSubmit}
            onClick={handleSave}
            onSuccessComplete={() => setSaveStatus("idle")}
          >
            Save Start Loadout
          </SaveButton>
        )}
      </div>
    </Container>
  );
}
