"use client";
import React from "react";
import {usePrintedCustomers} from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import {useProgServ} from "@/app/realGreen/progServ/_lib/hooks/useProgServ";

export default function CoverSheets() {
  usePrintedCustomers({autoLoad: true});
  useProgServ({autoLoad: true});
  return (
    <div>
      <div>CoverSheets</div>
    </div>
  );
}