"use client";

import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { entitySelect } from "@/app/realGreen/customer/selectors/entitySelectors";
import { useProgServ } from "@/app/realGreen/progServ/useProgServ";
import { useSelector } from "react-redux";

export default function Routing() {
  usePrintedCustomers({autoLoad: true});
  useProgServ({autoLoad: true})
  const services = useSelector(entitySelect.services("printed"));
  console.log(services);
  return (
    <div>
      <div>Routing page</div>
    </div>
  );
}
