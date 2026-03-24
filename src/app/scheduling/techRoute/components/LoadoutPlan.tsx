import { useSelector } from "react-redux";
import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";
import { aggregateLoadoutInventory } from "@/app/realGreen/customer/_lib/hooks/aggregateLoadoutInventory";

export function LoadoutPlan() {
  const services = useSelector(techRouteSelect.services);
  const loadoutInventory = aggregateLoadoutInventory(services);

  return (
    <div className={"flex flex-col gap-3"}>
      {loadoutInventory.masters.map((master) => {
        const masterAmountDisplay = master.product.unitConfigDisplay.format({
          amount: master.plannedAmount,
          targetContexts: ["load"],
          rounding: "ceil",
        }).formattedString;

        return (
          <div
            key={master.product.productId}
            className={"flex flex-col gap-2 w-full bg-accent/20 rounded-lg p-3"}
          >
            {/* Master Header */}
            <div className={"flex justify-between items-center"}>
              <div className={"text-xl font-bold text-foreground"}>
                {master.product.description}
              </div>
              <div className={"text-lg font-semibold text-foreground/80"}>
                {masterAmountDisplay}
              </div>
            </div>

            {/* AppMethods Section */}
            {master.appMethods.map((appMethod) => (
              <div
                key={appMethod.appMethod.appMethodId}
                className={"flex flex-col gap-1 ml-4 bg-accent/30 rounded-md p-2"}
              >
                <div className={"text-lg font-semibold text-primary"}>
                  {appMethod.appMethod.description}
                </div>
                <div className={"flex flex-col gap-1 ml-4"}>
                  {appMethod.subProducts.map((sub) => {
                    const subAmountDisplay = sub.product.unitConfigDisplay.format({
                      amount: sub.plannedAmount,
                      targetContexts: ["load"],
                      rounding: "ceil",
                    }).formattedString;

                    return (
                      <div
                        key={sub.product.productId}
                        className={"flex justify-between items-center"}
                      >
                        <div className={"text-sm text-foreground/90"}>
                          {sub.product.description}
                        </div>
                        <div className={"text-sm font-medium text-foreground/70"}>
                          {subAmountDisplay}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Non-AppMethod Sub-Products */}
            {master.subProducts.length > 0 && (
              <div className={"flex flex-col gap-1 ml-4"}>
                <div className={"text-sm font-semibold text-foreground/60 uppercase"}>
                  Other Products
                </div>
                {master.subProducts.map((sub) => {
                  const subAmountDisplay = sub.product.unitConfigDisplay.format({
                    amount: sub.plannedAmount,
                    targetContexts: ["load"],
                    rounding: "ceil",
                  }).formattedString;

                  return (
                    <div
                      key={sub.product.productId}
                      className={"flex justify-between items-center bg-accent/10 rounded px-2 py-1"}
                    >
                      <div className={"text-sm text-foreground/90"}>
                        {sub.product.description}
                      </div>
                      <div className={"text-sm font-medium text-foreground/70"}>
                        {subAmountDisplay}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Singles (if any) */}
            {master.singles.length > 0 && (
              <div className={"flex flex-col gap-1 ml-4"}>
                <div className={"text-sm font-semibold text-foreground/60 uppercase"}>
                  Additional Items
                </div>
                {master.singles.map((single) => {
                  const singleAmountDisplay = single.product.unitConfigDisplay.format({
                    amount: single.plannedAmount,
                    targetContexts: ["load"],
                    rounding: "ceil",
                  }).formattedString;

                  return (
                    <div
                      key={single.product.productId}
                      className={"flex justify-between items-center bg-secondary/10 rounded px-2 py-1"}
                    >
                      <div className={"text-sm text-foreground/90"}>
                        {single.product.description}
                      </div>
                      <div className={"text-sm font-medium text-foreground/70"}>
                        {singleAmountDisplay}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty State */}
      {loadoutInventory.masters.length === 0 && (
        <div className={"text-center text-foreground/50 py-8"}>
          No products planned for selected services
        </div>
      )}
    </div>
  );
}
