import { useAppProducts } from "@/app/realGreen/customer/_lib/hooks/useAppProducts";
import { useSelector } from "react-redux";
import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { aggregateLoadouts } from "@/app/realGreen/customer/_lib/hooks/loadoutUtils";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { ProductQuery } from "@/app/realGreen/product/_lib/ProductQuery";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
} from "@/components/MultiSelect";
import { ScrollArea } from "@/style/components/scroll-area";
import { isProductSubCore } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { isProductSingleCore } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/style/components/tabs";
import { useTechRoute } from "@/app/scheduling/techRoute/useTechRoute";

export function LoadoutPlan() {
  const {toggleLeftWith, updateLeftWith} = useTechRoute();
  const leftWith = useSelector(techRouteSelect.leftWith);
  const services = useSelector(techRouteSelect.services);
  const loadout = aggregateLoadouts(services);
  const subs = loadout.masters.flatMap((master) => master.subProducts);
  const allSingles = useSelector(productSelect.productSingles);
  const allSubs = useSelector(productSelect.productSubs);



  return (
    <div className={"flex flex-col gap-2"}>
      <div className={"flex flex-col gap-1"}>
        {subs.map((sub) => {
          const loadUnitDisplay = sub.product.unitConfigDisplay.format({
            amount: sub.amount,
            targetContexts: ["load"],
            rounding: "ceil",
          }).formattedString;
          return (
            <div
              key={sub.product.productId}
              className={
                "flex flex-col gap-1 w-full bg-accent/30 rounded-md py-1 px-2"
              }
            >
              <div className={"text-lg font-bold"}>
                {sub.config.useAppMethod
                  ? sub.config.appMethodId
                  : sub.product.description}
              </div>
              <div className={"flex flex-col gap-1 ml-4"}>
                <div className={"flex gap-1 flex-wrap"}>
                  <div>Calculated:</div>
                  <div>{loadUnitDisplay}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className={"flex flex-col gap-1"}>
        <div>
          <MultiSelect>
            <MultiSelectTrigger />
            <MultiSelectContent>
              <ScrollArea className={"h-64"}>
                <Tabs>
                  <TabsList>
                    <TabsTrigger value={"subs"}>Standard</TabsTrigger>
                    <TabsTrigger value={"singles"}>Specialty</TabsTrigger>
                  </TabsList>
                  <TabsContent value={"subs"}>
                    {allSubs.map((product) => {
                      return (
                        <MultiSelectItem
                          key={product.productId}
                          value={product.productId}
                        >
                          {product.description}
                        </MultiSelectItem>
                      );
                    })}
                  </TabsContent>
                  <TabsContent value={"singles"}>
                    {allSingles.map((product) => {
                      return (
                        <MultiSelectItem
                          key={product.productId}
                          value={product.productId}
                        >
                          {product.description}
                        </MultiSelectItem>
                      );
                    })}
                  </TabsContent>
                </Tabs>
              </ScrollArea>
            </MultiSelectContent>
          </MultiSelect>
        </div>
      </div>
    </div>
  );
}
