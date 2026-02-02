"use client";

import {useActiveCustomers} from "@/app/realGreen/customer/hooks/useActiveCustomers";

export default function Routing(){
  useActiveCustomers();
  return (
    <div>
      <div>Routing page</div>
    </div>
  )
}