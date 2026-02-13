"use client";
import { useLastSeasonProduction } from "@/app/realGreen/customer/hooks/useLastSeasonProduction";
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useSelector } from "react-redux";
import { bizPlanProductSelectors } from "@/app/bizPlan/products/selectors";
import { useEffect } from "react";

export default function BizPlanProductsPage() {
  useCustomerContext({ contexts: ["active", "lastSeasonProduction"] });
  useLastSeasonProduction({ autoLoad: true });
  useActiveCustomers({ autoLoad: true });
  useProduct({ autoLoad: true });

  const lyProductions = useSelector(bizPlanProductSelectors.lyProductions)

  useEffect(() => {
    console.log("productions", lyProductions)
  }, [lyProductions]);

  return <div>Biz Plan Products Page</div>;
}
