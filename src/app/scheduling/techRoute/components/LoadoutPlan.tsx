import { useSelector } from "react-redux";
import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";
import { aggregateLoadoutInventory } from "@/app/realGreen/customer/_lib/hooks/aggregateLoadoutInventory";
import { useTechRoute } from "@/app/scheduling/techRoute/useTechRoute";
import { useEffect } from "react";
import { MasterProductCard } from "./loadoutPlanSections/MasterProductCard";
import { AdditionalProductsSection } from "./loadoutPlanSections/AdditionalProductsSection";
import { Container } from "@/components/Containers";

export function LoadoutPlan() {
  const { updateStartLoadout } = useTechRoute();

  const services = useSelector(techRouteSelect.services);
  const loadoutInventory = aggregateLoadoutInventory(services);
  const startLoadout = useSelector(techRouteSelect.startLoadout);

  // Initialize startLoadout with structure from loadoutInventory
  useEffect(() => {
    if (loadoutInventory.masters.length > 0 && startLoadout.masters.length === 0) {
      const initializedLoadout = {
        masters: loadoutInventory.masters.map(master => ({
          ...master,
          startAmount: null,
          finishAmount: null,
          appMethods: master.appMethods.map(am => ({
            ...am,
            startAmount: null,
            finishAmount: null,
            subProducts: am.subProducts.map(sub => ({
              ...sub,
              startAmount: null,
              finishAmount: null,
            })),
          })),
          subProducts: master.subProducts.map(sub => ({
            ...sub,
            startAmount: null,
            finishAmount: null,
          })),
        })),
        singles: [],
        subProducts: [],
      };
      updateStartLoadout(initializedLoadout);
    }
  }, [loadoutInventory, startLoadout.masters.length, updateStartLoadout]);

  console.log("startLoadout", startLoadout);

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
