import { useAppProducts } from "@/app/realGreen/customer/_lib/hooks/useAppProducts";
import { useSelector } from "react-redux";
import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";

export function LoadoutPlan() {
  const { getPlannedAppProductTotal } = useAppProducts();
  const services = useSelector(techRouteSelect.services);
  const summary = getPlannedAppProductTotal(services);
  console.log("SUMMARY", summary);
  return (
    <div className={"flex flex-col gap-2"}>
      {summary.map((appProduct) => {
        const appAmount = appProduct.amount;
        const loadAmount = convertQuantity(
          appAmount,
          "app",
          "load",
          appProduct.productCommon.unitConfig,
        );
        console.log("LOAD AMOUNT", loadAmount);

        const loadPretty = appProduct.productCommon.unitConfigDisplay.format({
          amount: appAmount,
          targetContexts: ["load", "app"],
          rounding: "ceil",
        });

        console.log("LOAD PRETTY", loadPretty);

        //todo: Here's the problem: We don't have a connection between AppMethod
        // (via subProductConfig) and here.
        // even if we did, we don't have a connection that would say what
        // products are mixed within the appMethod product.  We don't really want
        // stonewall on this form, because it is mixed in water.  And we only
        // want to know how much mixed (water) they left and came back with.
        // Steps to solution:
        // 1. add mixedProductIds: number[] to SubProductConfigDoc
        // 2. hydrate mixedProducts inside subProductConfigDoc
        // 3. This leads us toward a structure similar to customer, program, service
        // 4. service has a master product.
        // 5. master product has a list of sub products.
        // 6. a sub product with an appMethod can claim some of the other
        //    sub products as children.
        // Setting this up would be a breaking change, for some current structures.
        // Particularly, useAppProduct.  However the breaking change is fixable if we
        // have a predictable hierarchy.

        return (
          <div
            key={appProduct.productId}
            className={"flex flex-col px-2 bg-accent/30 rounded-md"}
          >
            <div className={"text-lg font-bold"}>
              {appProduct.productCommon.description}
            </div>
            <div className={"flex gap-2"}>
              <div>Calculated:</div>
              <div>{loadPretty.formattedString}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
