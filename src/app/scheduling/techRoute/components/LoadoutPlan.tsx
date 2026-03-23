import { useAppProducts } from "@/app/realGreen/customer/_lib/hooks/useAppProducts";
import { useSelector } from "react-redux";
import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";

export function LoadoutPlan() {
  const services = useSelector(techRouteSelect.services);



  return (
    <div className={"flex flex-col gap-2"}>
    </div>
  );
}
