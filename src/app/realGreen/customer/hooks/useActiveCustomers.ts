import { useSelector } from "react-redux";
import { useEffect } from "react";
import { activeCustomersActions } from "@/app/realGreen/customer/slices/activeCustomersSlice";
import { useAppDispatch } from "@/lib/hooks/redux";
import { centralCustomerActions } from "@/app/realGreen/customer/slices/centralCustomerSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { customerSelect } from "@/app/realGreen/customer/selectors/centralSelectors";

export function useActiveCustomers() {
  const dispatch = useAppDispatch();
  const context = useSelector(customerSelect.context);

  useEffect(() => {
    if (context === "active") return;
    dispatch(centralCustomerActions.setCustomerContext("active"));
  }, [context, dispatch]);

  useEffect(() => {
    dispatch(
      activeCustomersActions.getCustDocs({
        params: {
          schemeName: "activeCustomers",
        },
        config: {
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [dispatch]);

  const refresh = () => {
    dispatch(
      activeCustomersActions.getCustDocs({
        params: {
          schemeName: "activeCustomers",
        },
        config: {
          force: true,
        },
      }),
    );
  };

  return { refresh };
}
