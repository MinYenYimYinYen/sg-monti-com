import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { can } from "@/permission/can";

// Product Forecast is a report over the active customers' services, so it gates on the customer
// read. The products, codes and unit conversions it also shows have their own reads.
export default function BizPlanProductsLayout({ children }: { children: React.ReactNode }) {
  return <GatedPanel requirement={can.customers.read}>{children}</GatedPanel>;
}
