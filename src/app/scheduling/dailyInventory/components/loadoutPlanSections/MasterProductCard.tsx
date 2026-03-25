import { useSelector } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { aggregateLoadoutInventory } from "@/app/realGreen/customer/_lib/hooks/aggregateLoadoutInventory";
import { AppMethodSection } from "./AppMethodSection";
import { SubProductSection } from "./SubProductSection";

type MasterProductCardProps = {
  masterProductId: number;
};

export function MasterProductCard({ masterProductId }: MasterProductCardProps) {
  const services = useSelector(loadoutFormSelect.services);
  const loadoutInventory = aggregateLoadoutInventory(services);

  const master = loadoutInventory.masters.find(
    (m) => m.product.productId === masterProductId,
  );

  if (!master) return null;

  return (
    <div className={"flex flex-col gap-2 w-full bg-accent/20 rounded-lg p-3"}>
      {/* Master Header */}
      <div className={"flex justify-between items-center"}>
        <div className={"text-xl font-bold text-foreground"}>
          {master.product.description}
        </div>
      </div>

      {/* AppMethods Section */}
      {master.appMethods.map((appMethod) => (
        <AppMethodSection
          key={appMethod.appMethod.appMethodId}
          masterProductId={masterProductId}
          appMethodId={appMethod.appMethod.appMethodId}
        />
      ))}

      {/* SubProducts Section */}
      <SubProductSection masterProductId={masterProductId} />
    </div>
  );
}
