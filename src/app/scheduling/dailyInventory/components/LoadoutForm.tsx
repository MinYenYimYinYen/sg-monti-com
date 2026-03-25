import { useSelector } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { aggregateLoadoutInventory } from "@/app/realGreen/customer/_lib/hooks/aggregateLoadoutInventory";
import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { useEffect } from "react";
import { MasterProductCard } from "./loadoutPlanSections/MasterProductCard";
import { AdditionalProductsSection } from "./loadoutPlanSections/AdditionalProductsSection";
import { Container } from "@/components/Containers";
import { loadoutHelper } from "@/app/scheduling/dailyInventory/components/loadoutFormHelpers";

export function LoadoutForm() {
  const { updateStartLoadout } = useLoadoutForm();

  const services = useSelector(loadoutFormSelect.services);
  const loadoutInventory = aggregateLoadoutInventory(services);
  const startLoadout = useSelector(loadoutFormSelect.startLoadout);

  // Initialize startLoadout with structure from loadoutInventory
  useEffect(() => {
    if (
      loadoutInventory.masters.length > 0 &&
      startLoadout.masters.length === 0
    ) {
      const initializedLoadout =
        loadoutHelper.initializeLoadout(loadoutInventory);
      updateStartLoadout(initializedLoadout);
    }
  }, [loadoutInventory, startLoadout.masters.length, updateStartLoadout]);

  if (!services.length) return <div className={"text-center text-foreground/50 py-8"}>
    <div>No route found. </div>
  </div>

  return (
    <Container variant={"page"}>
      <div className={"flex flex-col gap-3"}>
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
