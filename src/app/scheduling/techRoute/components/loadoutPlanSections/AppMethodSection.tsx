import { useSelector } from "react-redux";
import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";
import { aggregateLoadoutInventory } from "@/app/realGreen/customer/_lib/hooks/aggregateLoadoutInventory";
import { useTechRoute } from "@/app/scheduling/techRoute/useTechRoute";
import { Input } from "@/style/components/input";

type AppMethodSectionProps = {
  masterProductId: number;
  appMethodId: string;
};

export function AppMethodSection({
  masterProductId,
  appMethodId,
}: AppMethodSectionProps) {
  const { updateStartLoadout } = useTechRoute();

  const services = useSelector(techRouteSelect.services);
  const loadoutInventory = aggregateLoadoutInventory(services);
  const startLoadout = useSelector(techRouteSelect.startLoadout);

  // Find planned master and appMethod
  const plannedMaster = loadoutInventory.masters.find(
    (m) => m.product.productId === masterProductId,
  );
  const plannedAppMethod = plannedMaster?.appMethods.find(
    (am) => am.appMethod.appMethodId === appMethodId,
  );

  // Find actual master and appMethod in state
  const startMaster = startLoadout.masters.find(
    (m) => m.product.productId === masterProductId,
  );
  const startAppMethod = startMaster?.appMethods.find(
    (am) => am.appMethod.appMethodId === appMethodId,
  );

  if (!plannedAppMethod) return null;

  const mixProductAmountDisplay =
    plannedAppMethod.mixProduct.unitConfigDisplay.format({
      amount: plannedAppMethod.plannedAmount,
      targetContexts: ["load"],
      rounding: "ceil",
    }).formattedString;

  const handleAmountChange = (value: number | null) => {
    if (!startMaster) return;

    const updatedMasters = startLoadout.masters.map((m) => {
      if (m.product.productId === masterProductId) {
        return {
          ...m,
          appMethods: m.appMethods.map((am) => {
            if (am.appMethod.appMethodId === appMethodId) {
              return { ...am, startAmount: value };
            }
            return am;
          }),
        };
      }
      return m;
    });

    updateStartLoadout({ masters: updatedMasters });
  };

  return (
    <div className={"flex flex-col gap-2 bg-accent/30 rounded-sm p-1"}>
      {/* MixProduct with Input */}
      <div className={"flex items-center gap-2"}>
        <div className={"flex-1  text-foreground/90"}>
          {plannedAppMethod.mixProduct.productCode}
        </div>
        <div className={"text-sm text-foreground/70"}>
          Planned: {mixProductAmountDisplay}
        </div>
        <Input
          type="number"
          placeholder="Start amount"
          className="w-24"
          value={startAppMethod?.startAmount ?? ""}
          onChange={(e) => {
            const value = e.target.value ? parseFloat(e.target.value) : null;
            handleAmountChange(value);
          }}
        />
      </div>
    </div>
  );
}
