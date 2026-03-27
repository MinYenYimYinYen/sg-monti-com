import { useSelector, useDispatch } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { loadoutFormActions } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSlice";
import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { useEffect, useState } from "react";
import { MasterProductCard } from "./loadoutPlanSections/MasterProductCard";
import { AdditionalProductsSection } from "./loadoutPlanSections/AdditionalProductsSection";
import { Container } from "@/components/Containers";
import { loadoutHelper } from "@/app/scheduling/dailyInventory/components/loadoutFormHelpers";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { useAppDispatch } from "@/lib/hooks/redux";
import { loadoutActions } from "@/app/scheduling/dailyInventory/_lib/loadoutSlice";

export function LoadoutForm() {
  const dispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const { updateLoadout } = useLoadoutForm();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const services = useSelector(loadoutFormSelect.services);
  const loadoutInventory = useSelector(loadoutFormSelect.serviceResolvedLoadoutInventory);
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
    });

    const result = await appDispatch(
      loadoutActions.upsertLoadout({
        params: { loadout: loadoutDoc },
        config: { loadingMsg: "Saving loadout..." },
      }),
    );

    if (loadoutActions.upsertLoadout.fulfilled.match(result)) {
      setSaveStatus("success");
    } else {
      setSaveStatus("idle");
    }
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
