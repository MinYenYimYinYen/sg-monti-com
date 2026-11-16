"use client";

import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { SalesTaxMonthPicker } from "@/app/salesTax/_components/SalesTaxMonthPicker";
import { PrepayProbePanel } from "@/app/salesTax/_throwaway/PrepayProbePanel";
import { salesTaxUISelect } from "@/app/salesTax/salesTaxUISelect";
import { useSalesTaxCustomers } from "@/app/salesTax/useSalesTaxCustomers";
import { useSalesTaxDeps } from "@/app/salesTax/useSalesTaxDeps";

export default function SalesTaxPage() {
  useSalesTaxDeps();
  const { getCustomers } = useSalesTaxCustomers();
  const canGetCustomers = useSelector(salesTaxUISelect.canGetCustomers);

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <SalesTaxMonthPicker />
          <Button disabled={!canGetCustomers} onClick={getCustomers}>
            Load
          </Button>
        </div>
        <PrepayProbePanel />
      </div>
    </div>
  );
}
