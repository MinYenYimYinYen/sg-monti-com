import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { salesTaxCustomersGetDocs } from "@/app/realGreen/customer/slices/customerSlices";
import { salesTaxUISelect } from "@/app/salesTax/salesTaxUISelect";
import { buildSalesTaxCustomersPlan } from "@/app/salesTax/_lib/buildSalesTaxCustomersPlan";

/** No autoload: the user picks a month, then explicitly calls `getCustomers`. */
export function useSalesTaxCustomers() {
  const dispatch = useAppDispatch();
  const dateRange = useSelector(salesTaxUISelect.dateRange);
  const canGetCustomers = useSelector(salesTaxUISelect.canGetCustomers);

  const getCustomers = () => {
    if (!canGetCustomers || !dateRange) return;
    const plan = buildSalesTaxCustomersPlan(dateRange);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dispatch as any)(salesTaxCustomersGetDocs({ params: { plan } as any, config: { force: true } as any }));
  };

  return { getCustomers };
}
