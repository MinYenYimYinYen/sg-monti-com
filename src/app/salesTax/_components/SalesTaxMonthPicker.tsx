"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { MonthOfYear } from "@/components/MonthOfYear/MonthOfYear";
import { MonthOfYearValue } from "@/components/MonthOfYear/monthOfYearUtil";
import { salesTaxUISelect } from "@/app/salesTax/salesTaxUISelect";
import { salesTaxUIActions } from "@/app/salesTax/salesTaxUISlice";
import { monthOfYearFromRange, monthRange } from "@/app/salesTax/_lib/salesTaxDateRange";

export function SalesTaxMonthPicker() {
  const dispatch = useAppDispatch();
  const dateRange = useSelector(salesTaxUISelect.dateRange);
  const value = monthOfYearFromRange(dateRange);
  if (!value) return null;

  const handleChange = (next: MonthOfYearValue) => {
    dispatch(salesTaxUIActions.setDateRange(monthRange(next)));
  };

  return <MonthOfYear value={value} onChangeAction={handleChange} />;
}
