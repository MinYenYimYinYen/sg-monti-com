import { useSelector } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { aggregateLoadoutInventory } from "@/app/scheduling/dailyInventory/_lib/aggregateLoadoutInventory";
import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { useEffect } from "react";
import { MasterProductCard } from "./loadoutPlanSections/MasterProductCard";
import { AdditionalProductsSection } from "./loadoutPlanSections/AdditionalProductsSection";
import { Container } from "@/components/Containers";
import { loadoutHelper } from "@/app/scheduling/dailyInventory/components/loadoutFormHelpers";

export function LoadoutForm() {
  const { updateLoadout } = useLoadoutForm();

  const services = useSelector(loadoutFormSelect.services);
  const loadoutInventory = aggregateLoadoutInventory(services);
  const loadout = useSelector(loadoutFormSelect.loadout.data);

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
      </div>
    </Container>
  );
}
